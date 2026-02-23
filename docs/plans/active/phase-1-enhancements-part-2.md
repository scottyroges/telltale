# Plan: Phase 1 Enhancements Part 2

**Status:** Active
**Started:** 2026-02-22

## Overview

Second round of improvements and refinements to Phase 1 (Core Conversation) features. This continues the enhancement work from the original Phase 1 Enhancements plan.

Items will be added to this list as issues are discovered during testing. Each item should be addressed in its own PR or grouped logically with related items.

---

## Enhancements

### 1. Remove Question from Book (UI)

**Current behavior:**
- API endpoint exists: `book.removeQuestion` mutation accepts `bookQuestionId` and deletes the question
- No UI to call this endpoint
- Once a question is added to a book, there's no way to remove it from the UI

**Problem:**
- Users may accidentally add the wrong question to a book
- Users may decide a question isn't relevant for their story
- No way to clean up or reorganize the question list
- Dead-end UX: can only add, never remove

**Desired behavior:**
- Add a "Remove" or delete button for each question in the QuestionList component
- Clicking should confirm the action (prevent accidental deletions)
- After removal, update the UI (optimistic update or refetch)
- Only allow removal if the question interview hasn't been completed (to prevent data loss)
- Or: allow removal but warn if interview exists

**Implementation notes:**
- Update `QuestionList` component (`src/components/book-interviews/question-list.tsx`)
- Add remove button to each question item (maybe a small "×" or trash icon)
- Use `useMutation` with `trpc.book.removeQuestion.mutationOptions()`
- Consider confirmation dialog: "Remove this question from the book?"
- After successful removal, use `router.refresh()` to update the server-rendered data
- Handle loading state during deletion
- Consider: should questions with interviews be removable? If yes, warn user about data loss
- Test coverage for the remove functionality

**Acceptance criteria:**
- [ ] Remove button visible for each question in the list
- [ ] Clicking remove shows confirmation dialog
- [ ] Successful removal updates the UI immediately
- [ ] Loading state shown during deletion
- [ ] Error handling if deletion fails
- [ ] User cannot accidentally delete without confirmation
- [ ] Test coverage for remove functionality

---

## Future Items

_(Add new enhancements below as they're discovered during testing)_

---

## Notes

- Keep enhancements focused and scoped - if something grows large, consider making it a separate phase/plan
- Test each enhancement thoroughly before moving to the next
- Update this document with implementation details and learnings as work progresses
