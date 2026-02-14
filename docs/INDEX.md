# Documentation Index

## When to Consult

- **Tech stack & dependencies:** docs/stack.md
- **Project roadmap & phases:** docs/roadmap.md
- **Architecture decisions (and why):** docs/decisions/
- **System architecture & mental models:** docs/architecture/
- **Active work plans:** docs/plans/active/
- **Completed work plans:** docs/plans/completed/
- **Ideas & deferred concepts:** docs/ideas/

## Roadmap

- **docs/roadmap.md** — Full project roadmap, Phases 0-7, with acceptance criteria per phase

## Active Plans (Phase 1: Core Conversation)

- **docs/plans/active/1.4-interview-ui.md** — Interview session UI, interviews hub, conversation flow
- **docs/plans/active/1.5-insight-extraction.md** — Inline insight extraction — interviewer's "mental notes" produced with each response (ADR 014)
- **docs/plans/active/1.6-context-window-management.md** — Summarization, context assembly, insight injection for long conversations
- **docs/plans/active/1.7-email-apple-auth.md** — Email/password and Apple OAuth sign-in

## Completed Plans

- **docs/plans/completed/1.3-trpc-routers.md** — tRPC routers for questions, books, interviews; ownership verification helpers
- **docs/plans/completed/1.2-anthropic-sdk-conversation-service.md** — LLM provider interface, Anthropic SDK client, conversation service, system prompt
- **docs/plans/completed/1.1.1-kysely-migration.md** — Migrate repository query layer from Prisma client to Kysely (ADR 015)
- **docs/plans/completed/1.1-data-model-domain-repositories.md** — Prisma models, domain types, repository layer for Phase 1
- **docs/plans/completed/0.1-nextjs-scaffold.md** — Next.js 15, TypeScript strict, CSS Modules, directory structure
- **docs/plans/completed/0.2-testing-infrastructure.md** — Vitest 4, React Testing Library, Playwright, coverage via V8
- **docs/plans/completed/0.3-prisma-database.md** — Prisma 6, PostgreSQL, auth models, Docker Compose for local dev
- **docs/plans/completed/0.4-better-auth-configuration.md** — Better Auth 1.4, Google OAuth, middleware, sign-in/sign-out flow
- **docs/plans/completed/0.5-trpc-setup.md** — tRPC v11, auth-aware context, health-check router, React Query client, first service + repository
- **docs/plans/completed/0.6-vercel-deployment.md** — Vercel deployment, Neon database, auto-deploys on push, dynamic auth URL
- **docs/plans/completed/0.7-ci-quality-gates.md** — GitHub Actions CI, lint + unit tests on PRs and push to main

## Architecture

- **docs/architecture/system-overview.md** — Architecture principles, project structure, layer responsibilities
- **docs/architecture/data-model.md** — Entity relationships, model descriptions, schema rationale
- **docs/architecture/scaling-strategy.md** — Deployment phases, extraction triggers, cost projections

## Ideas (Deferred)

- **docs/ideas/depth-score.md** — Interview depth/richness metric, deferred until real conversations inform the design

## Decision Records

- **001** — Next.js monolith (vs. Spring Boot + SPA)
- **002** — tRPC for API layer (vs. REST, GraphQL)
- **003** — Prisma ORM (vs. Drizzle, TypeORM, raw SQL) — *superseded by 015*
- **004** — Neon for PostgreSQL hosting (vs. Supabase, PlanetScale)
- **005** — Better Auth for authentication (vs. Auth.js, Clerk, Supabase Auth)
- **005** *(superseded)* — Auth.js for authentication — see [005-better-auth.md](decisions/005-better-auth.md)
- **006** — Claude Sonnet for AI (vs. GPT-4, Claude Opus)
- **007** — CSS Modules + Radix UI (vs. Tailwind + shadcn/ui, styled-components)
- **008** — Cloudflare R2 for file storage (vs. AWS S3, Supabase Storage)
- **009** — Vercel for hosting (vs. Railway, Fly.io, AWS)
- **010** — Testing strategy: Vitest + React Testing Library + Playwright
- **011** — Server vs Client Component conventions
- **012** — Turbopack for development only (not production builds)
- **013** — Conversation response delivery: Plain request/response through tRPC, no streaming (vs. ReadableStream, Vercel AI SDK)
- **014** — Insight extraction strategy: Inline structured output vs. separate background call
- **015** — Query layer: Prisma Migrate + Kysely queries (vs. Prisma client, Drizzle, raw SQL)
