# Enhancement 8: "Ask Me Something Different" — Conversation Steering (Plan 0.2)

## Context

The "Try a different question" button is already wired up on the frontend (PR from plan 0.1), but it sends a visible user message with the redirect prompt text. The user wants the redirect message hidden from the transcript, with the logic moved to a dedicated backend API.

## Approach

Add a `hidden` boolean to the Message model. Create a new `interview.redirect` tRPC endpoint that takes only `interviewId`, creates a hidden USER message with the redirect prompt, generates an AI response, and returns it. The frontend calls this new endpoint instead of piping a hardcoded message through `sendMessage`.

**Important:** The topic message created during `startInterview` (line 42-49 of conversation.service.ts) was originally hidden via `messages.slice(1)` in the Transcript component. This was unified with the `hidden` field in a follow-up PR (see below).

**Follow-up (Complete):** Unified hiding mechanisms — `startInterview` now creates topic messages with `hidden: true`, data migration backfills existing topic messages, and `Transcript` uses `messages.filter(m => !m.hidden)` instead of `messages.slice(1)`. `interview-session` simplified `hasUserSentMessage` check since hidden topic messages are now filtered at the repository layer.

## PR 1: Schema + repository + domain type — Status: Complete

Added `hidden Boolean @default(false)` to Message model across all layers: Prisma schema + migration, Kysely DB types, domain type, repository (with `includeHidden` filter on `findByInterviewId`), context service (`includeHidden: true` so LLM sees hidden messages), frontend optimistic messages (`hidden: false`), and all test fixtures. Also added a `where` spy to the `mock-db` test helper to support asserting on query filters.

---

## PR 2: Backend redirect endpoint

### 1. Redirect prompt — `src/prompts/interviewer.ts`
Export `REDIRECT_PROMPT` constant with the redirect instruction text.

### 2. Conversation service — `src/services/conversation.service.ts`
Add `redirect(interviewId, bookId, userName)` method:
1. Create USER message with `hidden: true` and `REDIRECT_PROMPT` as content
2. Build context window (includes hidden messages)
3. Generate + parse AI response (with retry)
4. Create ASSISTANT message (visible)
5. Extract insights
6. Return `{ content }`

**No auto-completion on redirects.** The user explicitly asked to continue in a different direction — ending the interview in response would ignore their intent. They can always end manually.

This duplicates most of `sendMessage` — the differences are: content comes from the backend constant, the USER message is `hidden: true`, and auto-completion is skipped. Accept duplication for now; extract a shared helper only if it becomes painful.

### 3. tRPC router — `src/server/routers/interview.ts`
Add `redirect` procedure: `approvedProcedure`, input `{ interviewId: z.string() }`, verify ownership, check not COMPLETE, delegate to `conversationService.redirect()`.

### 4. Tests
- `tests/services/conversation.service.test.ts` — test `redirect` creates hidden USER message, generates response, persists ASSISTANT, extracts insights (no auto-completion check)
- `tests/server/routers/interview.test.ts` — test `redirect` verifies ownership, blocks on COMPLETE interviews

### Verify
- `npm run typecheck`
- `npm test -- tests/services/conversation.service.test.ts`
- `npm test -- tests/server/routers/interview.test.ts`

---

## PR 3: Frontend — wire redirect button to new API — Status: Complete

Added `redirectMutation` using `trpc.interview.redirect.mutationOptions()` in interview-session. No optimistic user message — only the ASSISTANT response is added to state on success. "Try a different question" button added to `InterviewInput` with `onRedirect` callback and `redirectDisabled` prop; disabled until user has sent at least one message. Input layout restructured with `inputRow` wrapper to accommodate redirect button below the send row. Full test coverage for both components.

## Follow-up: Unify hidden message mechanisms — Status: Complete

Unified the two separate hiding mechanisms (the `hidden` boolean from PR 1 and the `messages.slice(1)` hack for topic messages) into a single approach. `startInterview` now creates the topic message with `hidden: true`. Data migration `20260225000000_backfill_hidden_topic_messages` marks the first message of each existing interview as hidden. `Transcript` replaced `messages.slice(1)` with `messages.filter(m => !m.hidden)`. `interview-session` simplified `hasUserSentMessage` by removing the `i > 0` index guard, since hidden topic messages are now filtered at the repository layer. Tests updated across all affected components and services.

---

## Files summary

| File | PR | Change |
|------|-----|--------|
| `prisma/schema.prisma` | 1 | Add `hidden Boolean @default(false)` |
| `src/domain/message.ts` | 1 | Add `hidden: boolean` field |
| `src/repositories/message.repository.ts` | 1 | `hidden` in create, `includeHidden` filter |
| `src/services/context.service.ts` | 1 | Pass `{ includeHidden: true }` |
| `src/components/interview/interview-session.tsx` | 1, 3, FU | PR1: `hidden: false` in literals. PR3: redirect mutation. FU: simplify `hasUserSentMessage` |
| `src/prompts/interviewer.ts` | 2 | Export `REDIRECT_PROMPT` |
| `src/services/conversation.service.ts` | 2, FU | PR2: add `redirect()` method. FU: `startInterview` creates topic with `hidden: true` |
| `src/server/routers/interview.ts` | 2 | Add `redirect` procedure |
| `src/components/interview/transcript.tsx` | FU | Replace `messages.slice(1)` with `messages.filter(m => !m.hidden)` |
| `prisma/migrations/20260225000000_backfill.../migration.sql` | FU | Backfill `hidden=true` on first message of each interview |
