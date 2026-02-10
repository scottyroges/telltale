# Documentation Index

## When to Consult

- **Tech stack & dependencies:** docs/stack.md
- **Project roadmap & phases:** docs/roadmap.md
- **Architecture decisions (and why):** docs/decisions/
- **System architecture & mental models:** docs/architecture/
- **Active work plans:** docs/plans/active/
- **Completed work plans:** docs/plans/completed/

## Roadmap

- **docs/roadmap.md** — Full project roadmap, Phases 0-7, with acceptance criteria per phase

## Active Plans (Phase 0: Foundation)

- **docs/plans/active/0.1-nextjs-scaffold.md** — Next.js 15, TypeScript strict, CSS Modules, directory structure
- **docs/plans/active/0.2-prisma-database.md** — Prisma ORM, Neon PostgreSQL, Auth.js models, seed script
- **docs/plans/active/0.3-authjs-configuration.md** — Auth.js v5, Google OAuth, middleware, sign-in/sign-out flow
- **docs/plans/active/0.4-trpc-setup.md** — tRPC v11, auth-aware context, health-check router, React Query client
- **docs/plans/active/0.5-vercel-deployment.md** — Vercel deployment, CI on push, automated migrations

## Architecture

- **docs/architecture/system-overview.md** — Architecture principles, project structure, layer responsibilities
- **docs/architecture/data-model.md** — Entity relationships, model descriptions, schema rationale
- **docs/architecture/scaling-strategy.md** — Deployment phases, extraction triggers, cost projections

## Decision Records

- **001** — Next.js monolith (vs. Spring Boot + SPA)
- **002** — tRPC for API layer (vs. REST, GraphQL)
- **003** — Prisma ORM (vs. Drizzle, TypeORM, raw SQL)
- **004** — Neon for PostgreSQL hosting (vs. Supabase, PlanetScale)
- **005** — Auth.js for authentication (vs. Clerk, Supabase Auth)
- **006** — Claude Sonnet for AI (vs. GPT-4, Claude Opus)
- **007** — CSS Modules + Radix UI (vs. Tailwind + shadcn/ui, styled-components)
- **008** — Cloudflare R2 for file storage (vs. AWS S3, Supabase Storage)
- **009** — Vercel for hosting (vs. Railway, Fly.io, AWS)
