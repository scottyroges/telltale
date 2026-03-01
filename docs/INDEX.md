# Documentation Index

## When to Consult

- **Tech stack & dependencies:** docs/stack.md
- **Project roadmap & phases:** docs/roadmap.md
- **Architecture decisions (and why):** docs/decisions/
- **System architecture & mental models:** docs/architecture/
- **Operational guides:** docs/guides/
- **Active work plans:** docs/plans/active/
- **Completed work plans:** docs/plans/completed/
- **Known issues & bugs:** docs/known-issues.md
- **Ideas & deferred concepts:** docs/ideas/
- **Notes & thinking:** .personal/docs/notes/

## Roadmap

- **docs/roadmap.md** — Full project roadmap, Phases 0-7, with acceptance criteria per phase

## Active Plans

- **docs/plans/active/2a-interview-prompt-tuning.md** — Interview prompt tuning: improve conversation quality, tone, follow-up depth
- **docs/plans/active/2a-manual-test-plan.md** — Manual test script for 2a core memory block: step-by-step scenarios with SQL validation queries

## Completed Plans

- **docs/plans/completed/2a-parallel-llm-calls.md** — Parallel LLM calls: split conversation + memory into independent calls, streaming response via tRPC generators, memory service (4 PRs)
- **docs/plans/completed/2a-core-memory-block.md** — Core memory block: replace per-message insight extraction with a bounded, evolving memory document on Book that persists across interviews (4 phases + follow-up fixes)
- **docs/plans/completed/2a.4-cleanup-cross-interview-verification.md** — Phase 4 of 2a: remove dormant insight code from conversation loop, clean up deprecated types, add cross-interview memory verification tests
- **docs/plans/completed/2a.3-context-assembly-conversation-service.md** — Phase 3 of 2a: wire core memory into context assembly and conversation service, replace insight injection with memory block, persist updated memory to Book
- **docs/plans/completed/2a.2-system-prompt-response-format.md** — Phase 2 of 2a: rewrite interviewer prompt for core memory block, update response parser for `updatedCoreMemory`, increase max tokens
- **docs/plans/completed/2a.1-schema-repository-layer.md** — Phase 1 of 2a: add `coreMemory` field to Book model, migration, domain type, repository method, fixture updates

- **docs/plans/completed/phase-1-enhancements-part-2.md** — Second round of Phase 1 improvements (question removal UI, chat readability, interview layout/scroll fixes, back navigation, duplicate interview bug, interview completion/exit strategy, personalize with user name, conversation steering control, usage guidance/helper text)
- **docs/plans/completed/decouple-interviews-from-questions.md** — Decouple interviews from catalog questions: Interview owns `topic` text, BookQuestion optionally links via `interviewId`, single `startInterview(bookId, topic)` path (3 PRs)
- **docs/plans/completed/phase-1-enhancements.md** — First round of Phase 1 improvements (token-based summarization, password visibility, Google icon, SSL modes, loading states, dashboard polish)
- **docs/plans/completed/1.7-email-apple-auth.md** — Email/password authentication, sign-up/sign-in flows, password reset (3 PRs)
- **docs/plans/completed/1.6-context-window-management.md** — Summarization, context assembly, insight injection, hard token limit enforcement (3 PRs)
- **docs/plans/completed/1.5-insight-extraction.md** — Inline insight extraction, JSON response parsing, retry logic, getInsights endpoints (ADR 014, ADR 016)
- **docs/plans/completed/1.4-interview-ui.md** — Books, book interviews, interview session UI, dashboard entry point
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

## Guides

- **docs/guides/admin-approval-flow.md** — User approval system, admin role management, protected operations

## Architecture

- **docs/architecture/system-overview.md** — Architecture principles, project structure, layer responsibilities
- **docs/architecture/data-model.md** — Entity relationships, model descriptions, schema rationale
- **docs/architecture/context-window-management.md** — Sliding window strategy, summarization thresholds, mental models with examples
- **docs/architecture/auth-patterns.md** — Better Auth API naming, authentication flows, security best practices
- **docs/architecture/frontend-patterns.md** — Client/server component patterns, tRPC usage, common pitfalls
- **docs/architecture/testing-patterns.md** — Testing guidelines, user-facing tests, React Query test setup, environment stubs
- **docs/architecture/scaling-strategy.md** — Deployment phases, extraction triggers, cost projections

## Notes

- **notes/book-perspective.md** — First person vs. third person narrative perspective: trade-offs, implications for interviews and final book
- **notes/insights-as-biographer-notes.md** — How professional biographers organize notes, and what the insights system can learn from their practices
- **notes/insights-strategy.md** — Strategic analysis of insights serving three jobs (interviewer memory, cross-interview continuity, book creation index), industry research on memory architectures
- **notes/biography-reverse-chain.md** — Working backward from finished biography to raw interviews: the full data supply chain, what each stage produces and consumes
- **notes/insights-system-analysis.md** — Honest analysis of the insights system: what it solves, how it works, and where it falls short
- **notes/processing-transcripts.md** — Strategic Chunking with Overlap (Map-Reduce) for processing long transcripts: chunk sizing, overlap rationale, "Lost in the Middle" phenomenon
- **notes/raw-interviews-to-biography.md** — Turning raw interview material into a cohesive biography: synthesis pipeline, narrative architecture, through-lines
- **notes/story-creation-flow.md** — End-to-end vision: interviews → story tagging → completeness assessment → book outline → narrative generation → export/print
- **notes/story-flow-critique.md** — Critical analysis of story creation flow: artificial phase boundaries, alternative approaches, phased value delivery

## Ideas (Deferred)

- **docs/ideas/admin-ui.md** — Admin UI for question library, user management, system monitoring; use scripts for now
- **docs/ideas/depth-score.md** — Interview depth/richness metric, deferred until real conversations inform the design
- **docs/ideas/interview-categories-cross-topic-threads.md** — Group interviews into broader categories to surface loose threads from related topics and follow up naturally
- **docs/ideas/llm-driven-interview-planning.md** — Replace the question catalog with LLM-driven interview planning: onboarding conversation generates tailored topics, post-interview reflection proposes follow-ups
- **docs/ideas/interview-ui-alternatives.md** — Alternative UI approaches: word processor-focused interface, inline comment/annotation interface

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
- **013** — Conversation response delivery: Plain request/response through tRPC, no streaming (vs. ReadableStream, Vercel AI SDK) — *superseded: streaming now implemented via tRPC generators*
- **014** — Insight extraction strategy: Inline structured output vs. separate background call
- **015** — Query layer: Prisma Migrate + Kysely queries (vs. Prisma client, Drizzle, raw SQL)
- **016** — LLM structured output reliability: defensive parsing + single retry (vs. tool use / function calling)
- **017** — Observability stack: Axiom + Sentry + Better Stack + PostHog (vs. Datadog, Grafana Cloud)
- **018** — Insight context placement: near end vs. beginning (vs. both positions, system prompt injection, split old/recent)
- **019** — App-shell layout with container scroll (vs. viewport scroll, viewport units for interview only)
- **020** — Async job processing: Inngest for MVP, BullMQ + Railway at scale (vs. pg-boss, Trigger.dev, Vercel cron)
- **021** — Interviews independent of catalog questions: Interview owns `topic` as plain text, BookQuestion optionally links via `interviewId` (vs. keeping questionId FK, dual-path approach)
