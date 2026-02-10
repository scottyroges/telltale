# Tech Stack

- **Framework:** Next.js 15 (App Router) — full-stack TypeScript, SSR, API routes
- **Language:** TypeScript (strict mode) — end-to-end type safety
- **API Layer:** tRPC — typesafe API calls, no codegen
- **ORM:** Prisma — generated types from schema, migrations
- **Database:** PostgreSQL via Neon — serverless Postgres
- **Auth:** Auth.js (NextAuth v5) — OAuth + email support
- **Styling:** CSS Modules + Radix UI — scoped CSS, accessible unstyled component primitives
- **AI:** Anthropic Claude API (Sonnet) — conversation engine, story synthesis, thread extraction
- **File Storage:** Cloudflare R2 — S3-compatible, audio file storage
- **Deployment:** Vercel — git-push deploys, optimized for Next.js

## Architecture

Monolith-first. All business logic in `src/services/` with zero framework dependencies. Service layer isolation enables future extraction without rewriting logic. tRPC routers are thin wrappers over services. Repository layer abstracts database access.
