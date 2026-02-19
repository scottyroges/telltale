# Plan Reviewer Memory — Telltale

## Architecture Patterns
- Layer stack: App Router → tRPC Routers (thin) → Services (framework-agnostic) → Repositories (Kysely) → DB
- Services NEVER import Prisma directly; repositories return domain types
- Domain types are TypeScript-only (no runtime code)
- Backend tests in `tests/` mirror `src/` structure; frontend tests co-located in `src/`
- Ownership chain for auth: resource → book → `book.userId === ctx.userId`. Helpers in `src/server/routers/ownership/`
- tRPC routers use `verifyInterviewOwnership`, `verifyBookOwnership`, etc. before delegating to services
- Vitest test files use `// @vitest-environment node` directive and `vi.hoisted()` for mock factories

## Key Infrastructure (Completed Plans)
- Insight model, repository (`insightRepository`) exist from Plan 1.1 — `createMany`, `findByInterviewId`, `findByBookId`, `markExplored`
- `LLMProvider` interface: `generateResponse(systemPrompt, messages, options?) => Promise<{ content: string }>`
- `conversationService` methods: `startInterview(bookQuestionId)`, `sendMessage(interviewId, content)`, `getInterviewMessages`, `completeInterview`
- Interview router already has: `start`, `getById`, `sendMessage`, `getMessages`, `complete`
- `interviewRepository.findByBookId(bookId)` already exists — Plan 1.5's `getBookInsights` can use it directly

## Known Constraints
- `insightRepository.createMany()` requires `bookId` on each insight — Plan 1.5 service must source `bookId` (from interview record)
- `insightRepository.findByBookId()` already exists — `getBookInsights` in Plan 1.5 can use it directly (no need to iterate per-interview)
- The `Insight` domain type has `bookId` field — insights are queryable at the book level
