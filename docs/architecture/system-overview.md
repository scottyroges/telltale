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

The type chain: Prisma schema → Kysely database types (via `prisma-kysely`) → domain types → tRPC procedures → frontend. Changing a field in the schema produces compile errors everywhere that field is referenced. Runtime validation via Zod at API boundaries.

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
│   │   ├── books/
│   │   ├── books/new/
│   │   ├── book/[bookId]/interviews/
│   │   └── interview/[interviewId]/
│   ├── api/auth/[...all]/     # Better Auth API handler
│   └── api/trpc/[trpc]/      # tRPC HTTP handler
│
├── server/                    # Server-side code
│   ├── routers/               # tRPC routers (thin wrappers over services)
│   ├── trpc.ts                # tRPC initialization + context
│   └── auth.ts                # Better Auth configuration
│
├── prompts/                   # LLM prompt templates (centralized for review/iteration)
│   ├── interviewer.ts         # System prompt for AI interviewer
│   └── summarization.ts       # Prompt for conversation summarization
│
├── services/                  # Business logic (NO framework imports)
│   ├── conversation.service   # AI interview engine
│   ├── story.service          # Story CRUD + lifecycle
│   ├── synthesis.service      # Conversation → polished narrative
│   ├── response-parser        # Parse structured LLM output (response text + insights)
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
│   ├── books/                 # Book list and create form
│   ├── book-interviews/       # Question list and catalog
│   └── interview/             # Interview session, transcript, input
│
└── hooks/                     # Custom React hooks

tests/                             # Backend tests (mirrors src/ structure)
├── repositories/
├── services/
├── server/routers/
├── lib/
└── helpers/                       # Shared factories, fixtures, mocks

e2e/                               # Playwright E2E tests (critical user flows)
```

## Layer Responsibilities

**App Router (`app/`)** — Routing, layouts, page-level data fetching. No business logic.

**tRPC Routers (`server/routers/`)** — Input validation via Zod, auth checks, delegation to services. Thin wrappers only. Ownership verification helpers in `server/routers/ownership/` enforce access control before delegating to services. The chain is always: resource → book → `book.userId === ctx.userId`. Helpers throw `NOT_FOUND` for missing resources (before checking ownership, to avoid leaking existence) and `FORBIDDEN` for cross-user access.

**Services (`services/`)** — All business logic. Framework-agnostic. Can import from `repositories/`, `domain/`, and `lib/` only. Never imports from `app/` or `server/`.

**Repositories (`repositories/`)** — Database queries via Kysely (type-safe SQL query builder). Isolates the query layer from services — swapping the database client requires zero service changes. All repository methods return domain types (defined in `domain/`), never raw database types. Repositories write explicit SQL queries via Kysely's builder and map results to domain types. Services and routers work exclusively with domain types — they have no knowledge of the query layer. Schema and migrations are managed by Prisma; queries are written in Kysely (ADR 015).

**Domain (`domain/`)** — TypeScript types and interfaces shared across layers. No runtime code.

**Lib (`lib/`)** — Thin wrappers around external SDKs (Anthropic, R2, Kysely database instance). Configuration and client instantiation only. Also contains tRPC wiring: `lib/trpc/client.tsx` provides the React Query-backed tRPC client for Client Components, `lib/trpc/server.ts` provides `serverTRPC()` for Server Components to call procedures directly without HTTP.
