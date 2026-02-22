# Tech Stack

- **Runtime:** Node.js 22 LTS (pinned via `.nvmrc`)
- **Framework:** Next.js 15 (App Router) — full-stack TypeScript, SSR, API routes
- **Language:** TypeScript (strict mode) — end-to-end type safety
- **API Layer:** tRPC v11 — typesafe API calls, no codegen, superjson transformer
- **Data Fetching:** TanStack React Query 5 — server state management for tRPC client
- **Validation:** Zod 4 — runtime schema validation at API boundaries
- **Schema & Migrations:** Prisma 6 — schema source of truth, auto-generated migrations
- **Query Layer:** Kysely — type-safe SQL query builder, full SQL control (ADR 015)
- **Database:** PostgreSQL 16 — local via Docker Compose, Neon for production
- **Auth:** Better Auth — OAuth, TypeScript-first, Kysely adapter (shared DB instance), plugin ecosystem
- **Styling:** CSS Modules + Radix UI — scoped CSS, accessible unstyled component primitives
- **AI:** Anthropic Claude API (Sonnet) — conversation engine, story synthesis, insight extraction
- **Email:** Resend — transactional email for verification and password reset
- **File Storage:** Cloudflare R2 — S3-compatible, audio file storage
- **Testing:** Vitest + React Testing Library (unit/integration), Playwright (E2E)
- **Deployment:** Vercel — git-push deploys, optimized for Next.js

## Architecture

Monolith-first. All business logic in `src/services/` with zero framework dependencies. Service layer isolation enables future extraction without rewriting logic. tRPC routers are thin wrappers over services. Repository layer abstracts database access. Queries are written in Kysely (type-safe SQL builder) while Prisma handles schema definition and migrations (ADR 015).
