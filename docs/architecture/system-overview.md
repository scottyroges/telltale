# System Overview

## Architecture Principles

### Monolith First

Everything lives in one Next.js application. No microservices, no separate backend, no Docker/Kubernetes. Solo developer building a product — operational simplicity is paramount.

### Service Layer Isolation

All business logic lives in `src/services/` with zero framework dependencies. Route handlers and tRPC procedures are thin wrappers. This ensures:

- Business logic is independently testable
- Services can be extracted to a separate backend (Kotlin/Spring Boot, standalone Node, etc.) when needed
- The migration path is clean: swap the import, not the logic

### Strong Types, End to End

The type chain: Prisma schema → generated TypeScript types → tRPC procedures → frontend. Changing a field in the schema produces compile errors everywhere that field is referenced. Runtime validation via Zod at API boundaries.

### Scale Later, Architect Now

Decisions keep scaling options open without paying the complexity cost upfront:
- Service layer pattern enables future service extraction
- Neon Postgres is just Postgres — can migrate to any provider
- Cloudflare R2 is S3-compatible — can swap to AWS S3
- No vendor-specific features that create deep lock-in

## Project Structure

```
src/
├── middleware.ts               # Route protection (cookie check via Better Auth)
├── app/                       # Next.js App Router (routes + layouts only)
│   ├── (auth)/                # Auth pages (login)
│   ├── (app)/                 # Authenticated app pages (session-validated layout)
│   │   ├── dashboard/
│   │   ├── books/[id]/
│   │   ├── stories/[id]/
│   │   └── conversation/[sessionId]/
│   ├── api/auth/[...all]/     # Better Auth API handler
│   └── api/trpc/[trpc]/      # tRPC HTTP handler
│
├── server/                    # Server-side code
│   ├── routers/               # tRPC routers (thin wrappers over services)
│   ├── trpc.ts                # tRPC initialization + context
│   └── auth.ts                # Better Auth configuration
│
├── services/                  # Business logic (NO framework imports)
│   ├── conversation.service   # AI interview engine
│   ├── story.service          # Story CRUD + lifecycle
│   ├── synthesis.service      # Conversation → polished narrative
│   ├── thread-extraction.service # Extract follow-up hooks from messages
│   ├── book.service           # Book assembly + export
│   └── audio.service          # Transcription + TTS (Phase 2)
│
├── repositories/              # Database access layer
│
├── domain/                    # Shared types and interfaces
│
├── lib/                       # External API clients (Anthropic, R2, Prisma, etc.)
│   └── trpc/                  # tRPC wiring
│       ├── client.tsx         # React client (TRPCReactProvider, useTRPC)
│       └── server.ts          # Server-side caller (serverTRPC())
│
├── components/                # React components
│   ├── providers.tsx          # Root provider composition (tRPC, React Query, future providers)
│   ├── ui/                    # Base components (Radix UI primitives + CSS Modules)
│   ├── conversation/          # Chat UI, message bubbles, mic button
│   ├── stories/               # Story cards, editor, synthesis review
│   └── books/                 # Book preview, chapter management
│
└── hooks/                     # Custom React hooks

tests/                             # Backend tests (mirrors src/ structure)
├── services/
├── server/routers/
├── lib/
└── helpers/                       # Shared factories, fixtures, mocks

e2e/                               # Playwright E2E tests (critical user flows)
```

## Layer Responsibilities

**App Router (`app/`)** — Routing, layouts, page-level data fetching. No business logic.

**tRPC Routers (`server/routers/`)** — Input validation via Zod, auth checks, delegation to services. Thin wrappers only.

**Services (`services/`)** — All business logic. Framework-agnostic. Can import from `repositories/`, `domain/`, and `lib/` only. Never imports from `app/` or `server/`.

**Repositories (`repositories/`)** — Database queries via Prisma. Returns domain types. Isolates Prisma from services for future ORM swaps.

**Domain (`domain/`)** — TypeScript types and interfaces shared across layers. No runtime code.

**Lib (`lib/`)** — Thin wrappers around external SDKs (Anthropic, R2, Prisma client singleton). Configuration and client instantiation only. Also contains tRPC wiring: `lib/trpc/client.tsx` provides the React Query-backed tRPC client for Client Components, `lib/trpc/server.ts` provides `serverTRPC()` for Server Components to call procedures directly without HTTP.
