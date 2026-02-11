# Tech Stack

- **Runtime:** Node.js 22 LTS (pinned via `.nvmrc`)
- **Framework:** Next.js 15 (App Router) — full-stack TypeScript, SSR, API routes
- **Language:** TypeScript (strict mode) — end-to-end type safety
- **API Layer:** tRPC — typesafe API calls, no codegen
- **ORM:** Prisma 6 — generated types from schema, migrations
- **Database:** PostgreSQL 16 — local via Docker Compose, Neon for production
- **Auth:** Better Auth — OAuth, TypeScript-first, Prisma adapter, plugin ecosystem
- **Styling:** CSS Modules + Radix UI — scoped CSS, accessible unstyled component primitives
- **AI:** Anthropic Claude API (Sonnet) — conversation engine, story synthesis, thread extraction
- **File Storage:** Cloudflare R2 — S3-compatible, audio file storage
- **Testing:** Vitest + React Testing Library (unit/integration), Playwright (E2E)
- **Deployment:** Vercel — git-push deploys, optimized for Next.js

## Architecture

Monolith-first. All business logic in `src/services/` with zero framework dependencies. Service layer isolation enables future extraction without rewriting logic. tRPC routers are thin wrappers over services. Repository layer abstracts database access.
