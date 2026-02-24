# Plan: Decouple Interviews from Questions

**Status:** Not Started
**Created:** 2026-02-23
**Goal:** Make interviews independent of catalog questions to enable flexible conversation flows — custom prompts, AI-generated follow-ups, and experimentation with different entry points.

---

## Context

**Current coupling:**
- Interviews require a `questionId` (NOT NULL constraint)
- Unique constraint `[bookId, questionId]` prevents multiple interviews per question
- Starting an interview requires picking from the catalog first
- The flow is rigid: catalog → book → interview

**Why this blocks experimentation:**
- Can't start interviews with custom prompts
- Can't create AI-generated follow-up interviews ("You mentioned X, let's explore that")
- Can't have multiple interviews exploring different angles of the same question
- Async processing can't spawn interviews to fill story gaps
- Questions feel like homework, not conversation starters

**Vision:**
Catalog questions become suggestions, not requirements. Interviews are the raw material — they should start from anywhere: catalog, custom prompt, AI-generated follow-up, or triggered by async story analysis.

---

## Phases

### Phase 1: Schema & Repository Layer (Foundation)

**Goal:** Make the data model support optional questions without breaking existing flows.

**Changes:**

1. **Migration: Make `questionId` nullable**
   - `ALTER TABLE interview ALTER COLUMN "questionId" DROP NOT NULL`
   - Remove unique constraint on `[bookId, questionId]`
   - Add new field: `startingPrompt TEXT NOT NULL` — stores the initial prompt (whether from catalog or custom)
   - Backfill existing interviews: `UPDATE interview SET "startingPrompt" = (SELECT prompt FROM question WHERE id = interview."questionId")`
   - This is a **non-breaking migration** — existing code still works

2. **Update Interview domain type**
   ```typescript
   export type Interview = {
     id: string;
     bookId: string;
     questionId: string | null;  // ← Now optional
     startingPrompt: string;      // ← New required field
     status: InterviewStatus;
     createdAt: Date;
     updatedAt: Date;
   };
   ```

3. **Update interview repository**
   - `create()` now accepts: `{ bookId, startingPrompt, questionId?: string }`
   - `findByBookIdAndQuestionId()` still works (for backward compat), but returns `Interview | null` (multiple may exist)
   - Add new query: `findByBookId(bookId)` returns all interviews for a book (regardless of questionId)

4. **Update conversation service**
   - `startInterview(bookQuestionId)` still works — looks up question prompt, passes both questionId and startingPrompt
   - Add new: `startCustomInterview(bookId, startingPrompt)` — no questionId, just the prompt
   - The rest of the service is unchanged (messages, insights, completion all work the same)

**Tests:**
- Migration can run and backfill existing data
- Repository can create interviews with and without questionId
- Service can start interviews both ways
- Existing interview flow still works (catalog → book → interview)

**Risks:**
- **Breaking UI:** Frontend expects questionId to find interviews — needs update in Phase 2
- **Data integrity:** Need to handle null questionId in ownership verification

---

### Phase 2: API & Ownership Layer

**Goal:** Add new tRPC endpoints and update ownership verification to handle nullable questionId.

**Changes:**

1. **New tRPC procedure: `interview.startCustom`**
   ```typescript
   startCustom: approvedProcedure
     .input(z.object({
       bookId: z.string(),
       startingPrompt: z.string().min(10).max(500)
     }))
     .mutation(async ({ ctx, input }) => {
       await verifyBookOwnership(input.bookId, ctx.userId);
       return conversationService.startCustomInterview(
         input.bookId,
         input.startingPrompt
       );
     })
   ```

2. **Update `interview.start` (existing endpoint)**
   - Keep signature the same: `{ bookQuestionId }`
   - Still works for catalog-based flow
   - No breaking changes

3. **Update ownership verification**
   - `verifyInterviewOwnership` currently loads interview + checks bookId → userId
   - No changes needed (questionId is just metadata)

4. **Update `book.getById` response**
   - Currently returns `BookWithDetails` with interviews matched by questionId
   - Need to handle interviews without questionId
   - Return all interviews, let UI decide how to display them

**Tests:**
- `interview.startCustom` creates interview with null questionId
- `interview.start` still works for catalog questions
- Ownership verification works for both types
- `book.getById` returns all interviews

**Risks:**
- **API versioning:** If we need to change response shape, consider adding `book.getByIdV2`
- **Validation:** Need to prevent abuse (rate limiting on custom interviews?)

---

### Phase 3: UI Updates (Enable Custom Interviews)

**Goal:** Update UI to support starting interviews without picking from catalog, while keeping catalog flow intact.

**Changes:**

1. **Book interviews page (`/book/[bookId]/interviews`)**

   **Current layout:**
   - "Your Questions" section (BookQuestions with status)
   - "Add More Questions" section (catalog browser)

   **New layout:**
   - **"Your Interviews" section** (all interviews, regardless of source)
     - Shows `interview.startingPrompt` (not question.prompt)
     - For catalog-based interviews, shows question badge/tag
     - For custom interviews, shows "Custom" badge
     - Each has Continue/Review link
   - **"Start a New Interview"** — big input field + "Begin" button (calls `interview.startCustom`)
   - **"Or Choose from Catalog"** — collapsible section with catalog browser (existing QuestionCatalog component)

2. **Interview session page (`/interview/[interviewId]`)**
   - Header shows `interview.startingPrompt` (not question.prompt)
   - Back button goes to `/book/[bookId]/interviews`
   - No changes to transcript/input (works the same)

3. **Component changes:**
   - **Rename** `QuestionList` → `InterviewList` (better semantic name)
   - `InterviewList` receives `Interview[]` instead of `BookQuestion[]`
   - Remove dependency on `bookQuestions` entirely (interviews are the source of truth)
   - `QuestionCatalog` still exists (for catalog-based flow) but is optional/collapsible

4. **BookQuestion status lifecycle — what happens?**
   - **Option A (Keep it):** When starting custom interview, don't touch BookQuestion at all. BookQuestionStatus is only for catalog-based flow.
   - **Option B (Deprecate it):** Remove BookQuestionStatus entirely, derive status from interviews. If interview exists → STARTED. If interview.status = COMPLETE → COMPLETE.
   - **Recommendation:** Option A for now (less churn), Option B later (simpler model)

**States:**
- Empty state: "No interviews yet. Start your first conversation below."
- Loading state while starting custom interview
- Error handling if prompt is too short/long

**Tests:**
- Can start custom interview from book page
- Custom interview appears in interview list
- Catalog-based flow still works
- Interview page displays correct starting prompt

**Risks:**
- **UX confusion:** Users might not understand difference between catalog and custom
- **Discovery:** Catalog questions might get buried (test with real users)

---

### Phase 4: Cleanup & Future-Proofing

**Goal:** Remove technical debt and prepare for async interview creation.

**Changes:**

1. **Deprecate BookQuestion model (optional — defer if needed)**
   - BookQuestion was a join table to track "which catalog questions are in this book"
   - With custom interviews, this model is less useful
   - **Option:** Keep it for users who like the "checklist" UX, but make it optional
   - **Alternative:** Remove it entirely, derive everything from interviews

2. **Add interview metadata field (JSON)**
   - For future experimentation: store metadata like `{ source: 'catalog' | 'custom' | 'ai-generated', tags: [], relatedInterviewIds: [] }`
   - Enables tracking where interviews came from without rigid schema

3. **Async interview creation (future Phase 2.x work)**
   - Background job analyzes stories, identifies gaps
   - Creates interview with `startingPrompt` = "Let's talk more about [topic from analysis]"
   - No questionId, no user action required
   - This is now possible with the decoupled model

4. **Update docs**
   - `docs/architecture/data-model.md` — update Interview section to explain nullable questionId
   - `docs/ideas/story-creation-flow.md` — note that custom interviews are now possible
   - Add decision record: "ADR 021: Interviews independent of catalog questions"

**Tests:**
- All existing tests still pass
- New tests for custom interview flows
- Integration test: catalog → interview, custom → interview, both work

---

## Open Questions

1. **BookQuestion lifecycle:** Keep the model or deprecate it?
   - **Leaning toward:** Keep it for now (Phase 3 Option A), revisit in Phase 4
   - **Rationale:** Less churn, existing users aren't disrupted

2. **UI discoverability:** How do we prevent catalog questions from being buried?
   - **Options:**
     - Default to expanded catalog, collapse custom input
     - Show catalog as tabs: "Start Custom" | "Choose from Catalog"
     - Show recent/popular catalog questions as suggestions
   - **Recommendation:** Test with users, start simple (both visible)

3. **Multiple interviews per question:** Should we allow it?
   - **Current:** Unique constraint prevents it
   - **New model:** Nothing prevents it
   - **Use case:** "Let's talk about childhood again, from a different angle"
   - **Recommendation:** Allow it, see if users find it useful

4. **BookQuestion status tracking:** If we keep BookQuestion, how does status work with multiple interviews?
   - **Current:** One interview per question, status maps 1:1
   - **New model:** Multiple interviews possible, status is ambiguous
   - **Options:**
     - Status = COMPLETE if ANY interview is complete
     - Status = STARTED if ANY interview exists
     - Remove status entirely, show count of interviews
   - **Recommendation:** Show count, not status ("2 interviews")

5. **Migration strategy:** Can we migrate in place or do we need a feature flag?
   - **Leaning toward:** Migrate in place (low risk, backward compatible)
   - **Rationale:** Schema change is additive, API is additive, UI can deploy incrementally

6. **Rate limiting:** Should we limit custom interview creation to prevent abuse?
   - **Recommendation:** Not initially (trust users), add if needed

7. **Analytics:** Track catalog vs custom interview usage?
   - **Recommendation:** Yes, add to PostHog (when Phase 5 ships)

---

## Success Criteria

**Phase 1 complete when:**
- [ ] Migration runs cleanly on dev database
- [ ] Existing interviews have backfilled `startingPrompt`
- [ ] Repository can create interviews with and without questionId
- [ ] Service has both `startInterview` and `startCustomInterview`
- [ ] All existing tests pass

**Phase 2 complete when:**
- [ ] `interview.startCustom` endpoint exists and works
- [ ] `interview.start` still works (no regression)
- [ ] Ownership verification handles nullable questionId
- [ ] Tests cover both endpoints

**Phase 3 complete when:**
- [ ] Book interviews page shows all interviews (catalog + custom)
- [ ] User can start custom interview with arbitrary prompt
- [ ] Catalog questions are still visible and usable
- [ ] Interview session page works for both types
- [ ] Tests cover new UI flows

**Phase 4 complete when:**
- [ ] Docs updated (data model, ADR, story flow)
- [ ] Technical debt addressed (BookQuestion decision made)
- [ ] Async interview creation is possible (even if not implemented)
- [ ] All tests pass, no regressions

**End-to-end success:**
- [ ] User can start interview by typing a custom prompt
- [ ] User can still start interview from catalog
- [ ] Both types of interviews work identically once started
- [ ] Existing users see no breaking changes
- [ ] Future async processing can create interviews

---

## PR Strategy

**PR 1: Schema migration + repository layer**
- Migration file (nullable questionId, add startingPrompt, backfill)
- Update Interview domain type
- Update interview.repository.ts
- Tests for repository
- **Merge first, let it bake** (doesn't affect UI yet)

**PR 2: Service + API layer**
- Add `startCustomInterview` to conversation.service.ts
- Add `interview.startCustom` tRPC procedure
- Update `book.getById` to return all interviews
- Tests for service + API
- **Still no UI changes** (API exists but unused)

**PR 3: UI — custom interview input**
- Book interviews page: add "Start a New Interview" section
- Call `interview.startCustom` on submit
- Show custom interviews in list alongside catalog-based
- Update interview page header to use `startingPrompt`
- Tests for UI components

**PR 4: UI — catalog as optional**
- Make catalog collapsible/secondary
- Refine interview list display (badges for source type)
- Polish empty states
- Tests for refined UI

**PR 5: Docs + cleanup**
- Update data-model.md
- Add ADR 021
- Update story-creation-flow.md
- Any final polish/bug fixes

---

## Implementation Notes

**Backward compatibility:**
- All existing code paths must continue working
- Catalog → book → interview flow unchanged
- Schema changes are additive (nullable, new column)
- API is additive (new endpoint, existing endpoint unchanged)

**Data integrity:**
- `startingPrompt` is always set (NOT NULL) — it's the source of truth
- `questionId` is metadata (nullable) — indicates if interview came from catalog
- No orphaned interviews (bookId foreign key, cascade on delete)

**Testing strategy:**
- Unit tests for repository, service, API
- Component tests for UI (mocked tRPC)
- Integration test: end-to-end flow (catalog and custom)
- Migration test: run migration on snapshot of prod-like data

**Rollback plan:**
- If Phase 3 UI confuses users, hide custom input behind feature flag
- Schema changes are safe (backward compatible)
- Can rollback UI without rolling back schema

---

## Future Opportunities (Not in This Plan)

Once interviews are decoupled:
- **AI-suggested interviews:** Background job analyzes stories, suggests new prompts
- **Interview templates:** Pre-filled prompts for common themes ("Tell me about your career", "Describe your childhood home")
- **Multi-interview stories:** One story draws from multiple interviews
- **Interview search:** Search all interviews by content, not just by question
- **Cross-book interviews:** Same interview referenced in multiple books
- **Conversation steering:** User can redirect mid-interview without starting over

These become **much easier** with a flexible interview model.

---

## Next Steps

1. **Review this plan** — does this match the vision?
2. **Decide on BookQuestion:** Keep or deprecate?
3. **Run `/plan-review`** — check for gaps, validate PR split
4. **Start Phase 1** — schema migration + repository layer
