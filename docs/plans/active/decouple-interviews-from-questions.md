# Plan: Decouple Interviews from Questions

**Status:** In Progress (1 of 3 PRs complete, PR 2 in progress)
**Created:** 2026-02-23
**Updated:** 2026-02-25
**Goal:** Make interviews independent of catalog questions to enable flexible conversation flows — custom prompts, AI-generated follow-ups, and experimentation with different entry points.

---

## Context

**Current coupling:**
- Interviews require a `questionId` (NOT NULL FK to Question)
- Unique constraint `[bookId, questionId]` prevents multiple interviews per question
- Starting an interview requires picking from the catalog first via BookQuestion
- The flow is rigid: catalog → BookQuestion → interview
- BookQuestion is an unnecessary indirection layer between catalog and interview

**Why this blocks experimentation:**
- Can't start interviews with custom prompts
- Can't create AI-generated follow-up interviews ("You mentioned X, let's explore that")
- Can't have multiple interviews exploring different angles of the same question
- Async processing can't spawn interviews to fill story gaps
- Questions feel like homework, not conversation starters

**Vision:**
Interviews own their topic as a plain text field. The catalog becomes a UI-level source of topic suggestions — click a catalog question and it pre-fills the topic. Custom topics work the same way. There's one path to start an interview: provide a book and a topic.

**Key design decisions:**

1. **Remove `questionId` FK from Interview, add `topic` text field.** Interview has zero dependency on the Question model. The `topic` stores the prompt used to start the conversation, whether it came from catalog or user input.

2. **BookQuestion links to its Interview.** Users can browse the catalog and queue up questions they want to explore. BookQuestion tracks which catalog questions are in a book. Starting an interview from a BookQuestion copies `question.prompt` into `topic` and sets `bookQuestion.interviewId` to the new interview. The presence of `interviewId` is the completion state — no enum needed.

3. **Remove `BookQuestionStatus` enum and `status` column. Add optional `interviewId` FK.** BookQuestion becomes a simple join between Book and Question, with an optional link to the Interview that was started from it.

4. **One way to start an interview: `start(bookId, topic)`.** The caller provides the topic — the service doesn't care where it came from. The catalog UI copies `question.prompt` into the topic field. Custom input provides it directly.

**What gets removed:**
- `BookQuestionStatus` enum and `status` column on BookQuestion
- `questionId` column on Interview
- `findByBookIdAndQuestionId` repository method
- Duplicate-interview check in `startInterview` (was based on unique constraint)
- Status update logic in `startInterview` (was updating BookQuestion status)

**What gets added:**
- `topic` text field on Interview — the prompt used to start the conversation
- `interviewId` optional FK on BookQuestion — links to the interview started from this question (null = not started)

**What stays:**
- `Question` model and `question.list` endpoint — catalog is still the source of suggested topics
- `BookQuestion` model — users' curated list of catalog questions per book, now with optional interview link
- `bookQuestion.repository.ts`, `book.addQuestion`, `book.removeQuestion` — managing the curated list
- `verifyBookQuestionOwnership` ownership check
- `QuestionList` component (updated: shows completion via `interviewId` instead of status enum)
- `QuestionCatalog` component

---

## Phases

### Phase 1: Schema, Data Layer, API & Page Fixes

**Goal:** Replace `questionId` FK with `topic` on Interview, remove `status` from BookQuestion, update all layers from database through API and pages. This is a single PR to keep the app deployable at every merge.

**Changes:**

#### Schema & Migration

1. **Migration**
   - Add `topic TEXT NOT NULL DEFAULT ''` to `interview`
   - Backfill: `UPDATE interview SET topic = (SELECT prompt FROM question WHERE id = interview."questionId")`
   - Backfill `book_question.interviewId`: `UPDATE book_question SET "interviewId" = (SELECT id FROM interview WHERE interview."bookId" = book_question."bookId" AND interview."questionId" = book_question."questionId")` (before dropping `questionId`)
   - Drop FK constraint, unique constraint, and index on `questionId` from `interview`
   - Drop `questionId` column from `interview`
   - Remove default on `topic` after backfill
   - Drop `status` column from `book_question`
   - Drop `BookQuestionStatus` enum
   - Add `interviewId TEXT` (nullable) column to `book_question` with FK to `interview(id)`
   - **Partially reversible** — `questionId` data is lost, but `book_question` table is preserved

2. **Update Prisma schema**
   - Interview model: remove `questionId`, `question` relation, `@@unique`, `@@index([questionId])`; add `topic String`
   - BookQuestion model: remove `status` field; add `interviewId String?` with `@relation` to Interview
   - Remove `BookQuestionStatus` enum
   - Remove `interviews` relation from Question model
   - Add `bookQuestion BookQuestion?` relation on Interview model (inverse of the FK)

3. **Regenerate Kysely types** — `prisma generate` updates `src/db/types.ts` and `src/db/enums.ts`

4. **Update domain types**
   - `src/domain/interview.ts`: replace `questionId: string` with `topic: string`
   - `src/domain/book-question.ts`: remove `status` field and `BookQuestionStatus` type; add `interviewId: string | null`
   - `src/domain/types.ts`: remove `BookQuestionStatus` export

#### Repository Layer

5. **Update interview repository**
   - `create()` accepts `{ bookId, topic }` instead of `{ bookId, questionId }`
   - Remove `findByBookIdAndQuestionId()`
   - Update column selections: add `topic`, remove `questionId`

6. **Update book-question repository**
   - Remove `updateStatus()` method and all status-related logic (status in queries, status column in selects)
   - Add `setInterviewId(bookQuestionId, interviewId)` method
   - Include `interviewId` in query select lists

7. **Update book repository**
   - `findByIdWithDetails()`: add `topic` to the interview subquery select list, remove `questionId` from the select list

#### Service Layer

8. **Update conversation service**
   - Replace `startInterview(bookQuestionId, userName?)` with `startInterview(bookId, topic, userName?)`
   - Remove BookQuestion lookup, duplicate-interview check, and status update
   - The hidden topic message uses the `topic` parameter directly
   - No separate `startCustomInterview` — there's just one `startInterview`

#### API Layer

9. **Update `interview.start` procedure**
   - Change input from `{ bookQuestionId }` to `{ bookId, topic, bookQuestionId? }` with validation (`.min(5).max(500)` on topic)
   - Verify book ownership directly via `verifyBookOwnership(bookId, userId)`
   - Call `conversationService.startInterview(bookId, topic, userName)`
   - If `bookQuestionId` provided: verify it exists and belongs to the same `bookId`, then call `bookQuestionRepository.setInterviewId(bookQuestionId, newInterviewId)` to link the BookQuestion to the new interview

10. **Update `book.addQuestion` / `book.removeQuestion`**
    - Remove status-related logic (no more status updates)

#### Pages & Components

11. **Update interview page (`/interview/[interviewId]/page.tsx`)**
    - Use `interview.topic` directly for the header display
    - Remove the `bookQuestion.find()` lookup that matched on `questionId`
    - No longer needs `trpc.question.list()` call

12. **Update `InterviewSession` component**
    - Rename `questionPrompt` prop to `topic`
    - Update header back link label from "Questions" to "Interviews" (or just "Back")
    - Update `COMPLETION_MESSAGE` — "return to the question list" → "return to your book"

13. **Update `InterviewInput` component**
    - Change redirect button text from "Try a different question" to "Ask me something else"

14. **Update `QuestionList` component**
    - Replace status badges (`StatusIndicator` + `BookQuestionStatus` enum) with completion state derived from `bookQuestion.interviewId` (null = not started, non-null = completed)
    - Remove interview-matching logic via `interview.questionId` — completion now comes from `bookQuestion.interviewId` directly
    - Completed questions link to their interview (`/interview/[interviewId]`)
    - Remove `RemoveQuestionButton` interview warning (removing a BookQuestion has no destructive consequence — it only removes from the curated list)
    - Display-only for now — no click-to-start-interview action (comes in Phase 2)

15. **Update guide page copy**
    - "Try a different question" → "Try a different topic" (or similar)
    - Also update "pick another question from the list" and other "question" references in guide copy

**Tests:**
- Repository: create interview with topic
- Repository: `bookQuestion.setInterviewId` links a BookQuestion to an interview
- Service: `startInterview(bookId, topic)` creates interview and returns first AI message
- `interview.start` creates interview with topic, validates topic length, verifies book ownership
- `interview.start` with `bookQuestionId` links the BookQuestion to the new interview
- `interview.start` with invalid `bookQuestionId` (nonexistent or belongs to a different book) rejects
- `interview.start` with `bookQuestionId` that already has an `interviewId` set (double-start) overwrites the link
- Interview page displays `topic` correctly
- Update existing conversation service tests to use new signature
- Update `interview.repository.test.ts` — references to `questionId` in fixtures/assertions
- Update `book.repository.test.ts` — add `topic` to interview subquery expectations
- Update `context.service.test.ts` — `questionId: "q1"` in interview fixtures
- Update `book-question.repository.test.ts` — remove status references, add `interviewId`
- Update `interview-session.test.tsx` — ~28 occurrences of `questionPrompt` prop → `topic`, redirect button label assertions
- Update `interview-input.test.tsx` — redirect button label "Ask me something else"
- Update `guide/page.test.tsx` — references to "question" copy
- Update `QuestionList` tests — completion state from `interviewId` instead of status enum

**PR 1: Schema + data layer + API + page fixes**

---

### Phase 2: UI — Book Page Updates

**Goal:** Add interview list and custom topic input to the book page. Keep question curation alongside the new interview flows.

**Changes:**

1. **Book interviews page (`/book/[bookId]/interviews`)**

   **Current layout:**
   - "Your Questions" section (`QuestionList` showing BookQuestions with status)
   - "Add More Questions" section (`QuestionCatalog` browser)

   **New layout:**
   - **"Your Interviews" section** — all interviews for the book
     - Shows `interview.topic` as the label
     - Shows status (active/completed) and date
     - Click navigates to `/interview/[interviewId]`
   - **"Your Questions" section** — `QuestionList` (updated, no status badges)
     - Shows curated catalog questions the user has added
     - Click a question to start an interview (copies `question.prompt` as topic)
   - **"Start a New Interview"** — text input + "Begin" button
     - Calls `interview.start` with `{ bookId, topic }`
   - **"Add More Questions"** — `QuestionCatalog` browser (unchanged)

2. **Add `InterviewList` component**
   - New component receives `Interview[]`
   - Each row: topic (truncated), status badge, created date

3. **Update `QuestionList`**
   - Add "Begin" action to start an interview from a queued question
   - Calls `interview.start({ bookId, topic: question.prompt, bookQuestionId })` — links the BookQuestion to the new interview
   - Completion state already shown in Phase 1 via `interviewId`

4. **New book landing experience**
   - After creating a book, user lands on `/book/{bookId}/interviews` with no interviews and no questions
   - Empty state should be inviting — show catalog prominently and custom topic input
   - Custom input available for users who know what they want to talk about

**States:**
- Empty state: "No interviews yet. Start your first conversation below." + prominent catalog
- Loading state while creating interview
- Validation feedback for topic input (10-500 chars)

**Tests:**
- Can start interview with custom topic
- Can start interview from catalog question via QuestionList
- Interview list shows all interviews with correct info
- Empty state renders correctly

**PR 2: Book page UI updates**

*PR 2 progress:* InterviewList component (topic, status badge, date, links to interview), TopicInput component (custom topic with 5-char min validation, calls `interview.start`, navigates on success), interviews page updated with "Your Interviews" and "Start a New Interview" sections. QuestionList click-to-start deferred.

---

### Phase 3: Docs & Cleanup

**Goal:** Update documentation and clean up dead code.

**Changes:**

1. Update `docs/architecture/data-model.md` — update Interview (topic instead of questionId), update BookQuestion (no status)
2. Update `docs/architecture/system-overview.md` — reflect simplified flow
3. Add ADR: "Interviews independent of catalog questions"
4. Grep for any remaining `questionId`, `BookQuestionStatus` references and clean up
5. Delete any orphaned test files

**PR 3: Docs + cleanup**

---

## Open Questions

1. **Catalog discoverability:** With custom input as the primary flow, will users still find the catalog useful?
   - Start with both visible. Iterate based on usage.

2. **Rate limiting:** Should we limit interview creation?
   - Not initially. Approval system already gates access.

3. **Topic message phrasing:** Should the hidden LLM prompt use the same template for all topics?
   - Start with the same template. Can differentiate later if needed.

### Resolved (post-review)

4. **PR split breakage:** PR 1 (schema) would break pages fixed in PR 2/3.
   - **Resolved:** Merged Phase 1 + Phase 2 into a single PR so the app stays deployable.

5. **Migration orphaned data:** Should backfill use COALESCE for dangling FKs?
   - **Resolved:** No — FK constraint is enforced, orphans can't exist.

6. **COMPLETION_MESSAGE copy:** What should replace "return to the question list"?
   - **Resolved:** "return to your book"

7. **InterviewInput redirect button:** Not mentioned in original plan.
   - **Resolved:** Change to "Ask me something else". Added to Phase 1.

8. **RemoveQuestionButton interview warning:** What happens after decoupling?
   - **Resolved:** Remove it — removing a BookQuestion only removes from the curated list, no destructive consequence.

9. **QuestionList behavior in Phase 1:** Should it support click-to-start?
   - **Resolved:** Display-only in Phase 1. Click-to-start comes in Phase 2.

10. **BookQuestion completion tracking:** How does the user know a catalog question has been started?
    - **Resolved:** Add optional `interviewId` FK on BookQuestion. Set when an interview is started from a BookQuestion. The presence of `interviewId` is the completion state — no enum needed. Link is one-directional: BookQuestion → Interview.

---

## Success Criteria

**Phase 1 complete when:**
- [x] Migration runs cleanly — backfills `topic`, drops `questionId`, removes `status` from BookQuestion
- [x] Interview repository creates with `topic`
- [x] Conversation service has single `startInterview(bookId, topic)` method
- [x] BookQuestion status removed; `interviewId` FK added to repository, domain types
- [x] `interview.start` accepts `{ bookId, topic }` with validation
- [x] Interview page uses `interview.topic` for display
- [x] `InterviewSession` prop renamed from `questionPrompt` to `topic`
- [x] `InterviewInput` redirect button says "Ask me something else"
- [x] `COMPLETION_MESSAGE` says "return to your book"
- [x] `QuestionList` shows completion via `interviewId` (display-only, no click-to-start action)
- [x] `RemoveQuestionButton` interview warning removed
- [x] Guide page copy updated
- [x] All existing tests updated and passing

**Phase 2 complete when:**
- [x] Book page shows interviews alongside curated questions
- [x] User can start interview with custom topic
- [ ] User can start interview from a curated question
- [ ] QuestionList updated (click to start interview)
- [x] Tests cover new UI (InterviewList, TopicInput)

**Phase 3 complete when:**
- [ ] Docs updated
- [ ] ADR written
- [ ] No dead `questionId` or `BookQuestionStatus` references remain

---

## PR Strategy

| PR | Scope | Risk |
|----|-------|------|
| 1  | Schema + data layer + API + page fixes | Medium (partially destructive migration, but all layers updated together so app stays deployable) |
| 2  | Book page UI updates | Low-Medium (additive — new components + minor updates) |
| 3  | Docs + cleanup | None |

---

## Implementation Notes

**Migration is partially destructive:**
- `questionId` column on Interview is dropped — not reversible
- `status` column on BookQuestion is dropped
- `book_question` table is preserved
- Backfill must complete successfully before drops
- Test migration on dev database first
- Back up prod before running

**Single interview start path:**
- `conversationService.startInterview(bookId, topic, userName?)` — the only way to start an interview
- Caller provides the topic string; service doesn't know or care about the source
- Catalog UI copies `question.prompt` into topic; custom UI takes user input directly

**Data integrity:**
- `topic` is NOT NULL — always set, source of truth for what the interview is about
- `bookId` FK remains — interviews always belong to a book
- Cascade on book delete preserves cleanup behavior

**Question and BookQuestion models stay:**
- `Question` table and `question.list` endpoint remain as the catalog data source
- `BookQuestion` stays as users' curated list of catalog questions per book, with optional `interviewId` FK to track which questions have been started
- The link is one-directional: BookQuestion → Interview. Interview knows nothing about questions.
- Questions are read-only reference data — no FK from Interview
- Could later become user-editable templates, AI-generated suggestions, etc.
