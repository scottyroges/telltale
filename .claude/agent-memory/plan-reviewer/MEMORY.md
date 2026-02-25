# Plan Reviewer Memory -- Telltale

## Architecture Patterns
- Layer stack: App Router -> tRPC Routers (thin) -> Services (framework-agnostic) -> Repositories (Kysely) -> DB
- Services NEVER import Prisma directly; repositories return domain types
- Domain types are TypeScript-only (no runtime code)
- Backend tests in `tests/` mirror `src/` structure; frontend tests co-located in `src/`
- Ownership chain for auth: resource -> book -> `book.userId === ctx.userId`. Helpers in `src/server/routers/ownership/`
- tRPC routers use `verifyInterviewOwnership`, `verifyBookOwnership`, etc. before delegating to services
- Vitest test files use `// @vitest-environment node` directive and `vi.hoisted()` for mock factories

## Key Infrastructure (Completed Plans)
- Insight model, repository (`insightRepository`) exist -- `createMany`, `findByInterviewId`, `findByBookId`, `markExplored`
- `LLMProvider` interface: `generateResponse(systemPrompt, messages, options?) => Promise<{ content: string }>`
- `conversationService` methods: `startInterview(bookQuestionId, userName)`, `sendMessage(interviewId, bookId, content, userName)`, `redirect(interviewId, bookId, userName)`, `getInterviewMessages`, `completeInterview`, `getInsights`, `getBookInsights`
- Interview router has: `start`, `getById`, `sendMessage`, `getMessages`, `getInsights`, `getBookInsights`, `redirect`, `complete`
- `interviewRepository.findByBookId(bookId)` already exists
- `ctx.userName` is available in tRPC context (used for LLM personalization)

## Known Constraints
- `insightRepository.createMany()` requires `bookId` on each insight
- Kysely types auto-generated from Prisma schema via `prisma-kysely` -- changing schema requires `prisma generate`
- BookQuestion, Question, Interview all use `@default(cuid())` but IDs are generated via `@paralleldrive/cuid2` in repositories
- `book.getById` uses `findByIdWithDetails` which returns `BookWithDetails` including nested bookQuestions + interviews
- The guide page references "question" terminology that must be updated when BookQuestion is removed

## Review Lessons
- When a plan changes an API input schema (e.g., `interview.start`), check ALL existing callers -- both server-side and client-side components that call the mutation. UI components with buttons/actions tied to the old API will break.
- When a plan adds optional FK parameters to an endpoint, always verify ownership of the optional resource too -- cross-book/cross-user linking is a common auth gap.
- CSS module class names often mirror prop names -- when renaming props, check the corresponding `.module.css` file for class names that should stay consistent.

## Broad Test Surface for Schema Changes
- When Interview schema changes, these test files need updates: `tests/repositories/interview.repository.test.ts`, `tests/services/conversation.service.test.ts`, `tests/server/routers/interview.test.ts`, `tests/services/context.service.test.ts`, `tests/repositories/book.repository.test.ts`, `tests/server/routers/book.test.ts`
- Frontend tests with questionId/questionPrompt: `src/components/interview/interview-session.test.tsx` (~28 occurrences of `questionPrompt`), `src/components/book-interviews/question-list.test.tsx`, `src/components/book-interviews/question-catalog.test.tsx`
