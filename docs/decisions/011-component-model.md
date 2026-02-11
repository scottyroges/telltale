# ADR 011: Server vs Client Component Conventions

**Status:** Accepted
**Date:** 2026-02

## Context

Telltale uses Next.js 15 App Router, where all components are Server Components by default. As we build auth pages (Plan 0.4) and more UI in Phase 1+, we need a clear convention for when to add `"use client"` vs keeping the default. Without this, it's easy to over-use Client Components — hurting performance by shipping unnecessary JavaScript — or to accidentally import server-only code into the client bundle.

## Decision

**Server Components by default.** Only add `"use client"` when a component needs interactivity, browser APIs, or React hooks. Push client boundaries as far down the component tree as possible.

## When to Use Client Components

Add `"use client"` only when the component uses one or more of these:

- **React state hooks** — `useState`, `useReducer`, `useContext`
- **Event handlers** — `onClick`, `onChange`, `onSubmit`, etc.
- **Lifecycle / effect hooks** — `useEffect`, `useLayoutEffect`
- **Browser APIs** — `window`, `localStorage`, `navigator`, etc.
- **Third-party libraries requiring client features** — e.g., animation libs, rich text editors
- **Auth context consumers** — `useSession()` or similar context hooks

## When to Use Server Components (the Default)

Keep the default (no directive) for:

- **Data fetching** — database queries, API calls, `auth()` session checks
- **Secret / env var access** — anything using `process.env` server secrets
- **Layouts and pages** — top-level route segments
- **Data-display components** — render props from a parent, no interactivity
- **Server Actions** — form submissions via `signIn`, `signOut`, etc.

## Composition Patterns

### Pages and layouts fetch, leaves interact

Pages and layouts are Server Components that fetch data and pass it down as props. Interactive widgets are small Client Components at the leaf nodes.

```
// app/dashboard/page.tsx (Server Component — no directive)
export default async function DashboardPage() {
  const session = await auth();
  const stories = await getStories(session.user.id);
  return <StoryList stories={stories} />;  // Server Component
}

// components/story-card-actions.tsx
"use client"
export function StoryCardActions({ storyId }: { storyId: string }) {
  return <button onClick={() => handleDelete(storyId)}>Delete</button>;
}
```

### Context providers wrap children without infecting them

`SessionProvider`, `TRPCProvider`, and similar providers are Client Components that accept `children`. The children passed in remain Server Components — the `"use client"` boundary doesn't propagate to children passed as props.

### Guard server-only modules

Use the `server-only` import guard on modules that must never reach the client bundle:

```ts
// src/server/auth.ts
import "server-only";
```

Apply this to `src/server/auth.ts`, `src/lib/prisma.ts`, and any module that touches secrets or the database directly.

## Common Mistakes to Avoid

- **Don't add `"use client"` to a whole page because one button needs `onClick`.** Extract the interactive part into its own Client Component and keep the page as a Server Component.
- **Don't import server-only code into Client Components.** The `server-only` guard will catch this at build time, but avoid it in the first place.
- **Props passed to Client Components must be serializable.** No functions, no Date objects, no Prisma model instances — only plain JSON-compatible data.

## Testing Implications

Ties to ADR 010 (Testing Strategy):

| Component Type | Test Approach |
|----------------|---------------|
| Server Components | E2E tests via Playwright (async Server Components aren't unit-testable yet) |
| Client Components | Unit tests with Vitest + React Testing Library |

## Consequences

- All new components default to Server Components unless they meet the criteria above
- `"use client"` directives are localized to the smallest possible component
- `server-only` guards are added to sensitive modules to catch mistakes at build time
- Code reviews should flag unnecessary `"use client"` directives
