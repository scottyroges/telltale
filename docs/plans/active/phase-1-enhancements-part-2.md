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

### 2. Improve Chat Interface Readability

**Current behavior:**
- Chat messages displayed with gray text on dark background
- Low contrast between message text and background
- Long messages may be difficult to scan and read

**Problem:**
- The chat interface is difficult to read due to low contrast
- Users may strain to read longer conversations
- Poor visual hierarchy makes it hard to distinguish between different message types (user vs AI)

**Desired behavior:**
- Higher contrast between text and background for better readability
- Clear visual distinction between user messages and AI responses
- Improved typography (font size, line height, spacing) for better legibility
- Consider lighter background for messages or darker text
- Ensure accessibility standards are met (WCAG AA minimum)

**Implementation notes:**
- Review and update chat component styles (likely in `src/components/book-interviews/` or similar)
- Test contrast ratios to meet WCAG AA standards (4.5:1 for normal text)
- Consider different background colors for user vs AI messages
- Adjust font size, weight, and line height for optimal readability
- Test on different screen sizes and lighting conditions
- May need to update color variables in CSS Modules

**Acceptance criteria:**
- [ ] Text contrast meets WCAG AA standards (4.5:1 minimum)
- [ ] Clear visual distinction between user and AI messages
- [ ] Messages are easy to read in various lighting conditions
- [ ] Improved typography makes long conversations comfortable to read
- [ ] Design feels polished and professional
- [ ] No regressions in other UI components

---

### 3. Fix Interview Layout and Scroll Behavior

**Current behavior:**
- When interview first loads, page auto-scrolls to chat portion
- Auto-scroll cuts off text awkwardly
- Text input box scrolls with the page
- Header scrolls with the page
- Small text input area makes it hard to see what you're writing for longer responses

**Problem:**
- Jarring initial load experience with awkward scroll position
- Users lose context when text input scrolls out of view
- Small text box doesn't accommodate the expected longer-form writing
- Header disappearing on scroll reduces navigation clarity
- Poor UX for the primary use case: writing detailed stories

**Desired behavior:**
- Fixed header that stays at the top of the viewport
- Text input box anchored to the bottom of the viewport (always visible)
- Larger text input area (multi-line textarea) so users can see what they're writing
- Only the conversation messages scroll in the middle section
- Clean initial load without awkward auto-scrolling
- Smooth, predictable scroll behavior as new messages arrive

**Implementation notes:**
- Update interview page layout to use fixed positioning for header and input
- Convert layout to:
  - `position: fixed` header at top
  - Scrollable conversation area in middle (with proper padding for fixed elements)
  - `position: fixed` input section at bottom
- Increase text input height (maybe 3-4 lines minimum, or expandable textarea)
- Remove auto-scroll on page load, or ensure it scrolls to show the input + last message
- Consider auto-scroll to bottom only when new AI message arrives
- Ensure mobile responsive (fixed positioning can be tricky on mobile)
- Test with long conversations to ensure scroll area works correctly

**Acceptance criteria:**
- [ ] Header stays fixed at top of screen
- [ ] Text input stays fixed at bottom of screen
- [ ] Text input is large enough to comfortably write 3-4 lines
- [ ] Conversation messages scroll smoothly in the middle area
- [ ] No awkward auto-scroll on initial page load
- [ ] New AI messages auto-scroll to show the response
- [ ] Layout works on mobile and desktop
- [ ] No overlapping or z-index issues between fixed elements

---

### 4. Add Navigation from Interview Back to Question List

**Current behavior:**
- Interview page has no back button or navigation to return to the question list
- Users can only use browser back button or manually edit the URL
- No clear path to exit an interview and choose a different question

**Problem:**
- Users feel trapped in the interview with no obvious way out
- Poor UX - navigation should always be clear and visible
- If user wants to switch to a different question, the path isn't obvious
- Breaks expected web navigation patterns

**Desired behavior:**
- Clear navigation option to return to the question list/book view
- Should be visible in the fixed header
- Could be a back arrow/button or breadcrumb navigation
- Preserves user's place in the book

**Implementation notes:**
- Add back button or breadcrumb to interview page header
- Link should go back to the book page showing all questions
- Could use Next.js `router.back()` or explicit link to `/books/[bookId]`
- Consider breadcrumb: "Book Name > Question Title"
- Ensure it's included in the fixed header (from enhancement #3)
- Style consistently with rest of the app

**Acceptance criteria:**
- [ ] Back/navigation button visible in interview header
- [ ] Clicking returns user to the question list for the current book
- [ ] Navigation works on mobile and desktop
- [ ] Clear visual indicator that it's a navigation element
- [ ] Consistent with app-wide navigation patterns

---

### 5. Fix Duplicate Interview Creation (Critical Bug)

**Current behavior:**
- When clicking on a question that already has an in-progress interview, a NEW interview is created
- Previous interview and all its messages are lost/inaccessible from the UI
- Multiple interviews can exist for the same question
- User loses all conversation history and has to start over

**Problem:**
- **CRITICAL BUG** - users lose their entire conversation history
- Creates duplicate interviews in the database for the same question
- Breaks the core value proposition: capturing ongoing stories
- Likely a routing or interview lookup issue
- May be creating new interview instead of finding existing one

**Desired behavior:**
- Clicking on a question should resume the existing interview if one exists
- Only create a new interview if no interview exists for that question
- Load all previous messages when resuming an interview
- Maintain conversation continuity across sessions

**Implementation notes:**
- Debug the question list click handler (likely in `src/components/book-interviews/question-list.tsx`)
- Check the interview creation/lookup logic in the tRPC router
- Should query for existing interview by `bookQuestionId` before creating new one
- If interview exists: redirect to existing interview with all messages
- If no interview exists: create new one
- May need to update the `startInterview` or similar mutation
- Consider adding a unique constraint on `(bookQuestionId, userId)` to prevent duplicates at DB level
- Need to migrate/clean up any duplicate interviews in the database
- Add proper error handling and logging

**Acceptance criteria:**
- [ ] Clicking a question resumes existing interview if one exists
- [ ] No duplicate interviews created for the same question
- [ ] All previous messages load when resuming an interview
- [ ] New interview only created when none exists
- [ ] Database constraint prevents duplicate interviews
- [ ] Cleanup script for existing duplicate interviews (if needed)
- [ ] Test coverage for both resume and new interview scenarios
- [ ] Error handling if interview lookup fails

---

### 6. Interview Completion and Exit Strategy

**Current behavior:**
- AI continues asking follow-up questions indefinitely
- No clear signal that an interview is "done"
- Users have no explicit way to end an interview
- No completion state tracked in the data model

**Problem:**
- Users may feel trapped in endless conversation
- Unclear when a topic has been sufficiently explored
- No data on which interviews are complete vs in-progress
- Makes it hard for future phases to determine which stories need more depth

**Desired behavior:**
- User has clear control over when to end an interview
- AI occasionally checks in: "Would you like to continue exploring this, or shall we wrap up?"
- Dedicated "I'm done with this topic" button always visible
- Interview marked as complete when user signals they're done
- Completion state saved in database for future processing

**Future phase implications:**
- Phase 2 will generate stories from interviews
- We'll need to analyze story completeness and depth
- Incomplete stories can be flagged for follow-up
- When user returns, can prompt: "Pick up where we left off, or start a new question?"
- Completed interviews have a `completedAt` timestamp for processing

**Implementation notes:**
- Add `completedAt` field to Interview model (nullable timestamp)
- Add "End Interview" or "I'm done with this topic" button to interview UI
- When clicked, mark interview as complete and show confirmation
- Update AI system prompt to occasionally ask if user wants to continue
  - Maybe after every 3-4 exchanges or when reaching natural pause points
  - Prompt: "We've covered a lot here. Would you like to keep going, or wrap up this topic?"
- Add visual indicator for completed vs in-progress interviews in question list
- Consider: Should completed interviews be resumable? (Probably yes, for adding more detail later)
- Update interview queries to filter/sort by completion status

**Acceptance criteria:**
- [ ] "End Interview" button visible in interview UI
- [ ] Clicking button marks interview as complete
- [ ] Confirmation message shown when interview marked complete
- [ ] AI periodically asks if user wants to continue (every 3-4 exchanges)
- [ ] `completedAt` timestamp saved when interview completed
- [ ] Completed interviews have visual indicator in question list
- [ ] Completed interviews can be resumed if user wants to add more
- [ ] Database migration for `completedAt` field
- [ ] Test coverage for completion flow

---

### 7. Personalize Conversation with User's Name

**Current behavior:**
- User provides their name during sign up
- Name is stored in the database but not used in conversations
- AI refers to user generically or not at all
- Conversation feels impersonal

**Problem:**
- Less engaging and natural than it could be
- Misses opportunity for personalization
- User has already shared their name - we should use it
- Personal storytelling works better with personal touch

**Desired behavior:**
- User's name included in conversation context
- AI uses name naturally in conversation:
  - "That's wonderful, Sarah. Tell me more about..."
  - "Thanks for sharing that, John. I'm curious about..."
- Not overused (would feel forced), but occasional natural usage
- Feels like talking to someone who knows you

**Implementation notes:**
- Verify user name is captured during sign up (Better Auth user model)
- If not captured during sign up, may need to add name field to sign up flow
- Add user name to conversation context in `src/services/context.service.ts`
- Update system prompt to include user's name
- Prompt guidance: "The user's name is {name}. Use it occasionally and naturally in conversation."
- Test that name appears correctly in AI responses
- Consider: Should we use first name only, or full name?
- Consider: What if user hasn't provided a name? (Graceful fallback)

**Acceptance criteria:**
- [ ] User name captured during sign up (or profile)
- [ ] User name passed to conversation context
- [ ] AI uses name naturally in responses (not too frequent)
- [ ] Name usage feels warm and personal, not robotic
- [ ] Graceful handling if name is missing
- [ ] Test coverage for context with/without name

---

### 8. "Ask Me Something Different" - Conversation Steering Control

**Current behavior:**
- AI follows a specific line of questioning based on user's previous response
- If user isn't interested in that thread, they have to either:
  - Answer anyway (even though they're not engaged)
  - Type something like "can we talk about something else?" (awkward)
  - Leave the interview entirely
- No explicit control over conversation direction

**Problem:**
- User may not be interested in the current follow-up thread
- AI might be exploring an angle that doesn't resonate
- User feels stuck following AI's lead, not truly collaborative
- Reduces user agency in their own storytelling
- Can make conversation feel rigid or forced

**Desired behavior:**
- Clear UI control to request different follow-up questions
- Button/link: "Ask me something different" or "Try a different angle"
- When clicked, AI pivots to explore a different aspect of the story
- User maintains engagement and feels empowered
- Conversation feels collaborative, not interrogative

**Implementation notes:**
- Add button near text input: "Ask me something different" (or similar wording)
- When clicked, send special message/flag to conversation service
- AI system prompt should handle this signal:
  - Acknowledge the pivot: "Of course! Let me ask you something different..."
  - Explore a different dimension: time, emotion, people involved, setting, impact, etc.
  - Don't repeat recent topics
- Could include conversation history context so AI knows what angles have been covered
- Consider A/B testing button labels:
  - "Ask me something different"
  - "Try another angle"
  - "Change direction"
  - "Explore something else"
- Visual design: Should be visible but not as prominent as main "Send" button
- Track usage analytics: How often do users use this? After how many exchanges?

**Acceptance criteria:**
- [ ] "Ask me something different" button/link visible in interview UI
- [ ] Clicking sends signal to AI to change conversation direction
- [ ] AI acknowledges the pivot and asks about a different aspect
- [ ] AI doesn't repeat recently covered topics
- [ ] Button is discoverable but not distracting
- [ ] Works well on mobile and desktop
- [ ] Analytics tracking for button usage
- [ ] Test coverage for conversation steering flow

---

### 9. Add Helper Text and Usage Guidance

**Current behavior:**
- User starts interview with no guidance on how to use the tool
- No explanation of the AI's role or the interview purpose
- Users may feel pressure to write perfect, polished responses
- Unclear that details will be transformed into stories later

**Problem:**
- Users don't know the "right" way to use the tool
- May think they need to write complete, polished stories now
- Might rigidly follow every AI question even if not interested
- Don't understand that AI is just helping them remember details
- Anxiety about "doing it wrong" reduces engagement
- Miss the key insight: **just capture details, we'll craft stories later**

**Desired behavior:**
- Clear, friendly guidance on how to use the tool effectively
- Communicate key principles:
  - **Answer what you want** - you're in control
  - **AI helps pull out details** - it's a memory aid, not an interrogator
  - **It's your story** - steer wherever you want to go
  - **Don't worry about polish** - just get the details down
  - **We'll craft stories later** - this is about capturing raw material
- Guidance should be visible but not intrusive
- Reduces anxiety, increases engagement

**Where to show guidance:**

1. **First interview onboarding** (one-time modal/tooltip)
   - "Here's how this works..."
   - Dismissible, don't show again

2. **Persistent helper text** (subtle, always visible)
   - Small text near input area
   - "Remember: Just share the details you remember. We'll turn this into a story later."

3. **"How to use this" link** (accessible anytime)
   - Link in header or near input
   - Opens explanation modal/panel

4. **Empty state text** (when no messages yet)
   - Before first response
   - "Share your memories however they come to you. The AI will help you remember more details."

**Suggested messaging:**

```
✨ How this works:

• Answer what feels right to you - skip what doesn't
• The AI asks questions to help you remember details
• Don't worry about making it sound "story-like" yet
• Just capture the who, what, when, where, and how you felt
• Later, we'll weave all these details into beautiful stories

Your story, your pace, your way.
```

**Implementation notes:**
- Add onboarding modal/tooltip for first interview
  - Use localStorage or database flag to track "has_seen_onboarding"
  - Dismissible with "Got it" button
- Add subtle helper text near text input
  - Small, muted text
  - Non-intrusive but always visible
- Consider adding "?" icon or "Tips" link in header
  - Opens helpful guidance modal
- Update empty state for new interviews
  - Show guidance before any messages
- Copy should be warm, encouraging, reduce anxiety
- Test with real users: Does this help or feel patronizing?

**Acceptance criteria:**
- [ ] First-time users see onboarding guidance
- [ ] Guidance communicates key principles clearly
- [ ] Helper text visible but not distracting
- [ ] "How to use this" accessible from interview page
- [ ] Copy feels encouraging and reduces anxiety
- [ ] Can dismiss onboarding (don't show again)
- [ ] Guidance works on mobile and desktop
- [ ] A/B test different copy variations (optional)

---

## Future Items

_(Add new enhancements below as they're discovered during testing)_

---

## Notes

- Keep enhancements focused and scoped - if something grows large, consider making it a separate phase/plan
- Test each enhancement thoroughly before moving to the next
- Update this document with implementation details and learnings as work progresses
