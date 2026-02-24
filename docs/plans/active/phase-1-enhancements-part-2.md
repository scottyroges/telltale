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
- [x] Remove button visible for each question in the list
- [x] Clicking remove shows confirmation dialog
- [x] Successful removal updates the UI immediately
- [x] Loading state shown during deletion
- [x] Error handling if deletion fails
- [x] User cannot accidentally delete without confirmation
- [x] Test coverage for remove functionality

**Status:** Complete (PR pending)

**Implementation:**
- Added remove button ("×") to each question in QuestionList component
- Shows different confirmation messages for questions with/without interviews
- Uses `useMutation` with `trpc.book.removeQuestion.mutationOptions()` pattern
- Calls `router.refresh()` on success to update server-rendered data
- Loading state during deletion (button shows "…" and is disabled)
- New `--color-destructive` CSS variable for hover state styling
- Comprehensive test coverage (6 new test cases)

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
- [x] Text contrast meets WCAG AA standards (4.5:1 minimum)
- [x] Clear visual distinction between user and AI messages
- [x] Messages are easy to read in various lighting conditions
- [x] Improved typography makes long conversations comfortable to read
- [x] Design feels polished and professional
- [x] No regressions in other UI components

**Status:** Complete (PR pending)

**Implementation:**
- Added dedicated CSS custom properties for message styling in `globals.css`:
  - `--color-message-assistant-bg`, `--color-message-assistant-text`, `--color-message-assistant-border`
  - `--color-message-thinking-bg`, `--color-message-thinking-text`
  - Light mode: `#ebebeb` background, `#1a1a1a` text, `#d4d4d4` border (high contrast)
  - Dark mode: `#1a1a1a` background, `#e8e8e8` text, `#2a2a2a` border (high contrast)
- Improved typography in message bubbles:
  - `font-size: 0.95rem` (slightly smaller, more readable)
  - `line-height: 1.6` (increased for better legibility)
- Enhanced visual distinction:
  - User messages: primary color background with subtle shadow (`box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)`)
  - Assistant messages: dedicated background color with 1px border for definition
  - Thinking indicator: matches assistant message styling for consistency
- Color variables replace generic `--color-muted` with message-specific tokens for better semantic clarity

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
- Header that stays at the top (sticky within container)
- Text input box anchored to the bottom of the viewport (always visible)
- Larger text input area (multi-line textarea) so users can see what they're writing
- Only the conversation messages scroll in the middle section
- Clean initial load without awkward auto-scrolling
- Smooth, predictable scroll behavior as new messages arrive

**Design decision: `position: sticky` vs `position: fixed` for header**
- Chose `position: sticky` over `position: fixed` for the header
- Reasoning: The interview session is a self-contained layout (`height: 100%`, `overflow: hidden` on parent container)
  - Sticky achieves the same visual effect (header always visible) with simpler implementation
  - No padding compensation needed (stays in document flow)
  - No z-index layering complexity
  - More stable on mobile Safari (avoids viewport height jumps when address bar shows/hides)
  - If we later want page-level scroll, sticky will adapt better to layout changes
- Fixed positioning would be overkill for this contained scrolling area
- If interview becomes part of a larger scrollable page in the future, we can revisit

**Design decision: Flexbox flow vs `position: fixed` for input**
- Chose flexbox normal flow over `position: fixed` for the input container
- Reasoning: The flexbox contained-scroll pattern achieves the same outcome as fixed positioning but with simpler implementation
  - Parent is `height: 100%` with `overflow: hidden` - input cannot scroll away, always at bottom
  - No z-index layering needed (input stays in document flow)
  - No padding compensation on transcript (no content hidden behind fixed element)
  - On mobile keyboard show/hide: viewport shrinks → container adjusts → input naturally stays at bottom
  - Resize listener already handles scroll position updates on viewport changes
  - Simpler width constraints (no need for centering logic on fixed element)
- Fixed positioning would add complexity (z-index, padding compensation, width handling) for the same user-facing result
- The contained scroll pattern is more maintainable and equally robust

**Design decision: Auto-expand textarea vs fixed 3-4 line minimum**
- Chose auto-expand textarea starting at 2.5rem (~1.5 lines) over fixed 3-4 line minimum
- Reasoning: Auto-expand provides better UX than a static large textarea
  - Starts compact (2.5rem min-height) and dynamically grows as user types
  - Maximizes transcript visibility for short messages (most common case)
  - Grows to unlimited space for long responses (10rem max before internal scroll)
  - Critical for mobile where vertical space is precious
  - Short messages don't waste screen space, long messages get room to breathe
- Implementation: JavaScript auto-expands textarea height to fit content (interview-input.tsx lines 19-24)
- Fixed 3-4 line minimum would waste vertical space for the common case (short messages) to optimize for the edge case (long messages)
- Auto-expand handles both cases optimally

**Color variable changes (intentional and necessary)**
- Interview components updated to use `--color-bg` and `--color-fg` instead of non-existent variables
- Previous code referenced `--color-background` and `--color-text-secondary` which don't exist in the codebase
- The standardized color system is defined in `src/app/globals.css`:
  - `--color-bg`: `#fafafa` (light) / `#0a0a0a` (dark)
  - `--color-fg`: `#111` (light) / `#ededed` (dark)
- These variables are used consistently across 30+ components in the app
- This change fixes interview components to properly inherit the app's theme (including dark mode)
- Not scope creep - this is a bug fix to use correct, existing CSS variables

**Negative margin approach (intentional tradeoff)**
- Interview layout uses `margin: -2rem -1.5rem` to create full-bleed layout within padded parent
- This negates the parent container's padding to allow interview to fill the entire viewport
- Creates coupling between parent and child layouts, but acceptable tradeoff for simplicity
- Negative margins are a common CSS pattern for full-bleed layouts within padded containers
- Alternative approaches (conditional parent padding, CSS Grid refactor) would add unnecessary complexity
- If parent padding changes in the future, interview layout will need corresponding adjustment

**Scroll behavior on container resize (needs implementation)**
- Current implementation doesn't handle window/container resize events
- Edge case: if viewport shrinks while user is at bottom, auto-scroll may stop working
- Important for mobile: keyboard appearance/dismissal changes viewport height
- Important for mobile: device rotation changes container dimensions
- Should add resize event listener to recalculate scroll position and maintain auto-scroll state
- Ensures consistent auto-scroll behavior across viewport changes

**Max-width duplication (needs refactoring)**
- The `max-width: 900px` value is repeated in `.header`, `.transcript`, and `.inputContainer`
- Should extract to CSS variable: `--interview-max-width: 900px`
- Benefits: Single source of truth, easier to adjust layout width in the future
- Prevents inconsistency if someone updates one instance but misses others

**Z-index management (document for now)**
- Header uses `z-index: 1` which is sufficient for current layout
- No centralized z-index system exists yet
- Should add comment documenting the z-index value and its purpose
- Future consideration: when adding modals/overlays, create a z-index scale (e.g., header: 10, modal: 100, tooltip: 1000)
- For now, documentation prevents accidental conflicts

**Initial scroll behavior (current approach approved)**
- Uses explicit `hasScrolledInitiallyRef` flag to track whether initial scroll has occurred
- More maintainable than checking `prevMessagesLengthRef.current === 0` as a proxy
- Clear intent: the flag's purpose is obvious to future developers
- Alternative (length check) would be less explicit and could break if scroll logic changes

**Implementation notes:**
- Update interview page layout using flexbox with contained scrolling
- Convert layout to:
  - `position: sticky` header at top (stays in document flow, simpler than fixed)
  - Scrollable conversation area in middle using flexbox (`flex: 1`, `overflow-y: auto`)
  - Input section in normal flow at bottom (contained by parent's `overflow: hidden`)
- Parent container uses `height: 100%` and `overflow: hidden` to contain the layout
- Use auto-expand textarea (starts compact, grows dynamically to fit content)
- Remove auto-scroll on page load, or ensure it scrolls to show the input + last message
- Consider auto-scroll to bottom only when new AI message arrives
- Ensure mobile responsive
- Test with long conversations to ensure scroll area works correctly

**Acceptance criteria:**
- [x] Header stays at top of screen (using sticky positioning)
- [x] Text input stays anchored at bottom of container (always visible, doesn't scroll away)
- [x] Text input auto-expands to fit content (starts compact, grows as user types)
- [x] Conversation messages scroll smoothly in the middle area
- [x] No awkward auto-scroll on initial page load
- [x] New AI messages auto-scroll to show the response
- [x] Layout works on mobile and desktop (including keyboard show/hide)
- [x] No overlapping or z-index issues

**Status:** Complete (PR pending)
**Related:** ADR 019 — App-shell layout with container scroll

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
- [x] Back/navigation button visible in interview header
- [x] Clicking returns user to the question list for the current book
- [x] Navigation works on mobile and desktop
- [x] Clear visual indicator that it's a navigation element
- [x] Consistent with app-wide navigation patterns

**Status:** Complete (PR pending)

---

### 5. Fix Duplicate Interview Creation (Critical Bug) ✅ DONE

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
- [x] Clicking a question resumes existing interview if one exists
- [x] No duplicate interviews created for the same question
- [x] All previous messages load when resuming an interview
- [x] New interview only created when none exists
- [x] Database constraint prevents duplicate interviews
- [x] Cleanup script for existing duplicate interviews (if needed)
- [x] Test coverage for both resume and new interview scenarios
- [x] Error handling if interview lookup fails

**Implementation:**
- Added `findByBookIdAndQuestionId()` repository method to check for existing interviews
- Updated `startInterview()` service to check for existing interview before creating new one
- Added unique constraint `@@unique([bookId, questionId])` at database level
- Migration includes cleanup logic that preserves most recent interview when duplicates exist
- Comprehensive test coverage for both resume and new interview scenarios
- Follow-up refactor: removed unused `openingMessage` from return value

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
- [x] "End Interview" button visible in interview UI
- [x] Clicking button marks interview as complete
- [x] Confirmation message shown when interview marked complete
- [x] AI checks in at natural conversation seams to see if user wants to wrap up
- [x] `completedAt` timestamp saved when interview completed
- [ ] Completed interviews have visual indicator in question list
- [ ] Completed interviews can be resumed if user wants to add more
- [x] Database migration for `completedAt` field
- [x] Test coverage for completion flow

**Status:** In Progress (3 of 4 PRs complete)

**Implementation:**
- **PR 1:** Schema migration (`completedAt` nullable timestamp on Interview model)
- **PR 2:** "End Interview" button UI with confirmation dialog, success message, and comprehensive test coverage (9 test cases)
  - Button visible only when status is ACTIVE
  - Disabled while mutation pending or waiting for AI response
  - Shows `window.confirm()` dialog before marking complete
  - Success message displayed after completion
  - Error handling with user-visible message
- **PR 3:** AI-initiated interview completion via `shouldComplete` field in JSON response format
  - System prompt updated: AI checks in at natural conversation seams (after a story arc completes, topic feels explored, natural pause); only sets `shouldComplete: true` after user explicitly agrees to wrap up
  - Response parser: extracts `shouldComplete` boolean (defaults to `false` if missing or non-boolean)
  - Conversation service: auto-completes interview via `interviewRepository.complete()` when `shouldComplete: true`
  - Frontend: hides input and end-interview button, shows completion message when AI signals completion
  - Test coverage across all layers (prompt, parser, service, component)
- **PR 4 (pending):** Completed interview visual indicators, resume capability

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
- [x] User name captured during sign up (or profile)
- [x] User name passed to conversation context
- [x] AI uses name naturally in responses (not too frequent)
- [x] Name usage feels warm and personal, not robotic
- [x] Graceful handling if name is missing
- [x] Test coverage for context with/without name
- [x] Prompt injection protection for user-supplied names

**Status:** Complete (PR pending)

**Implementation:**
- System prompt converted from static constant (`INTERVIEWER_SYSTEM_PROMPT`) to dynamic function (`getInterviewerSystemPrompt(userName?)`) in `src/prompts/interviewer.ts`
- Name context injected before Guidelines section: "The storyteller's name is {name}. Use their name occasionally and naturally -- like a friend would."
- `sanitizeUserName()` protects against prompt injection: strips newlines, removes non-name characters (preserves Unicode letters, accents, hyphens, apostrophes), truncates to 100 chars
- User name flows from auth context: `approvedProcedure` adds `ctx.userName` from the user record, threaded through `conversationService` -> `contextService` -> `getInterviewerSystemPrompt()`
- Backward-compatible: `INTERVIEWER_SYSTEM_PROMPT` constant still exported (calls function with no args) for existing tests
- Graceful fallback: empty/whitespace-only names produce the default prompt with no name reference
- Comprehensive test coverage: 8 new test cases covering name inclusion, sanitization (newlines, special chars, Unicode), truncation, and empty/missing name handling

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

### 10. User Approval System (Temporary Access Control)

**Context:**
- Currently in pre-launch/MVP phase without payment system
- Claude API calls are expensive and will rack up costs quickly
- Need to control who has access to the platform until we're ready to charge
- This is a temporary measure until proper billing/payment is implemented

**Current behavior:**
- Any user who signs up via Google OAuth gets full access immediately
- No approval process or access control
- All users can start interviews and call Claude API endpoints
- No way to limit access or manage beta users

**Problem:**
- **COST CONTROL** - Claude API calls are expensive
- Can't control who accesses the product during development/testing
- Risk of unauthorized users running up API bills
- No way to manage a limited beta user group
- Could get unexpected API charges from unknown users

**Desired behavior:**
- New users can sign up but are in "pending approval" state by default
- Pending users cannot access interview features or any Claude API endpoints
- Admin can approve/reject users (simple UI or even database flag)
- Approved users get full access to the platform
- Clear messaging to pending users: "Your account is pending approval"
- Admin notification when new users sign up (optional)

**Implementation notes:**
- Add `approvalStatus` enum field to User model:
  - `PENDING` (default for new signups)
  - `APPROVED` (full access)
  - `REJECTED` (blocked)
- Add middleware or auth check to block unapproved users from:
  - Interview pages (`/books/[bookId]/questions/[questionId]/interview`)
  - Interview API endpoints (tRPC mutations that call Claude)
  - Any other expensive API operations
- Create admin UI to manage user approvals:
  - List all users with approval status
  - Approve/reject buttons
  - Maybe at `/admin/users` route
  - Simple table: email, name, created date, status, approve/reject actions
- Add pending approval message for unapproved users:
  - Show on dashboard: "Your account is pending approval. You'll receive access soon!"
  - Maybe email notification when approved (optional)
- Consider: Who is admin?
  - Hardcoded email addresses in env var? (`ADMIN_EMAILS=scott@example.com`)
  - Add `isAdmin` boolean to User model?
  - For MVP, env var is probably fine
- Consider: Should middleware redirect or show message?
  - Redirect to `/pending-approval` page with clear message
  - Or show inline on dashboard/book pages
- Database migration for `approvalStatus` field
- Default existing users to `APPROVED` in migration

**Scope considerations:**
- Block access to interviews/Claude API (high priority)
- Block access to books/questions? (probably not needed - no API cost there)
- Block access to entire dashboard? (probably overkill - let them see the UI)
- Recommended: Just block the expensive operations (interviews + Claude API)

**Future removal:**
- When payment/billing is implemented, remove approval system
- Or convert to different use case: trial vs paid, free tier limits, etc.
- Make it easy to remove when no longer needed

**Acceptance criteria:**
- [x] New users default to `PENDING` approval status
- [x] Unapproved users cannot access interview pages
- [x] Unapproved users cannot call interview/Claude API endpoints
- [x] Clear message shown to pending users
- [x] Admin UI to view all users and their approval status
- [x] Admin can approve/reject users with single click
- [x] Approved users get full access immediately
- [x] Database migration adds `approvalStatus` field
- [x] Existing users migrated to `APPROVED` status
- [x] Admin access controlled via env var or user flag
- [x] Test coverage for approval checks
- [x] Documentation on how to approve users

**Status:** Complete

**Implementation:**
- Database schema: Added `approvalStatus` enum (PENDING/APPROVED/REJECTED) and `role` enum (USER/ADMIN) to User model
- Migration backfills existing users to APPROVED status
- Domain types: Created `src/domain/user.ts` with `UserApprovalStatus` and `UserRole` types
- Repository layer: `userRepository.findPendingUsers()` and `userRepository.updateApprovalStatus()`
- Service layer: `adminService` delegates to repository for approval operations
- tRPC middleware: `approvedProcedure` blocks unapproved users from expensive operations (FORBIDDEN error)
- tRPC middleware: `adminProcedure` restricts admin endpoints to users with ADMIN role
- Admin router: `admin.getPendingUsers()` and `admin.updateApprovalStatus()` endpoints
- Admin UI: `/admin/users` page lists pending users with approve/reject actions (route-level role check)
- User UI: Dashboard shows approval banner for pending users
- Protected operations: All interview mutations and queries use `approvedProcedure`
- Test coverage: Tests for `approvedProcedure`, `adminProcedure`, admin router, and interview router approval checks
- Documentation: Created `docs/guides/admin-approval-flow.md` with full approval system guide, including manual DB process for making users admins
- Updated architecture docs: data-model.md, system-overview.md, and testing-patterns.md

**Notes:**
- Admin promotion is currently a manual database operation (SQL UPDATE statement)
- Future enhancement: Environment variable for auto-promoting admin emails on login
- Rejection messaging shows same "pending" banner (rare edge case, not prioritized)

---

_(Add additional enhancements below as they're discovered during testing)_

---

## Notes

- Keep enhancements focused and scoped - if something grows large, consider making it a separate phase/plan
- Test each enhancement thoroughly before moving to the next
- Update this document with implementation details and learnings as work progresses
