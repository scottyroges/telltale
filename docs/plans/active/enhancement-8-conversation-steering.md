# Enhancement 8: "Ask Me Something Different" — Conversation Steering (Plan 0.2)

## Context

The "Try a different question" button is already wired up on the frontend (PR from plan 0.1), but it sends a visible user message with the redirect prompt text. The user wants the redirect message hidden from the transcript, with the logic moved to a dedicated backend API.

## Approach

Add a `hidden` boolean to the Message model. Create a new `interview.redirect` tRPC endpoint that takes only `interviewId`, creates a hidden USER message with the redirect prompt, generates an AI response, and returns it. The frontend calls this new endpoint instead of piping a hardcoded message through `sendMessage`.

**Important:** The topic message created during `startInterview` (line 42-49 of conversation.service.ts) is currently hidden via `messages.slice(1)` in the Transcript component. Marking it as `hidden: true` and removing the `slice(1)` hack is a natural follow-up but **out of scope** for this PR — we'd need to backfill existing data.

**Follow-up:** Unify hiding mechanisms — backfill `hidden: true` on topic messages in `startInterview`, migrate existing data, and remove the `messages.slice(1)` hack in Transcript.

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

## PR 3: Frontend — wire redirect button to new API

### 1. Interview session — `src/components/interview/interview-session.tsx`
- Remove `REDIRECT_MESSAGE` constant
- Add `redirectMutation` using `trpc.interview.redirect.mutationOptions()`:
  - `onMutate`: set `isWaitingForResponse = true`, clear error
  - `onSuccess`: add ASSISTANT message to state (no user message), clear waiting
  - `onError`: clear waiting, show error
- Change `handleRedirect` to call `redirectMutation.mutate({ interviewId })` instead of `handleSend(REDIRECT_MESSAGE)`
- Disable the redirect button until the user has sent at least one message (the AI's opening question alone isn't enough context for a meaningful redirect)

### 2. Tests
- Update `src/components/interview/interview-session.test.tsx` if it exists — redirect tests should verify no optimistic user message is added, only ASSISTANT response

### Verify
- `npm run typecheck`
- `npm test -- src/components/interview`
- Manual: `npm run dev`, start interview, click "Try a different question" — no user message appears, AI responds with a different angle

## Files summary

| File | PR | Change |
|------|-----|--------|
| `prisma/schema.prisma` | 1 | Add `hidden Boolean @default(false)` |
| `src/domain/message.ts` | 1 | Add `hidden: boolean` field |
| `src/repositories/message.repository.ts` | 1 | `hidden` in create, `includeHidden` filter |
| `src/services/context.service.ts` | 1 | Pass `{ includeHidden: true }` |
| `src/components/interview/interview-session.tsx` | 1, 3 | PR1: add `hidden: false` to message literals. PR3: new redirect mutation |
| `src/prompts/interviewer.ts` | 2 | Export `REDIRECT_PROMPT` |
| `src/services/conversation.service.ts` | 2 | Add `redirect()` method |
| `src/server/routers/interview.ts` | 2 | Add `redirect` procedure |
