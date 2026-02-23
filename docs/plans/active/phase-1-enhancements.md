# Plan: Phase 1 Enhancements

**Status:** Active
**Started:** 2026-02-21

## Overview

Improvements and refinements to Phase 1 (Core Conversation) features based on manual testing. These should be completed before moving to Phase 2.

Items will be added to this list as issues are discovered during testing. Each item should be addressed in its own PR or grouped logically with related items.

---

## Enhancements

### 1. Token-Based Summarization Thresholds

**Current behavior:**
- Summarization logic uses message count as the primary metric
- Recent window is defined as "last 5 messages"
- Threshold is 8,000 tokens, but splitting logic is based on message count

**Problem:**
- Message length varies dramatically between users
- Some users write 3-sentence responses, others write 500-word stories
- Message count doesn't accurately reflect context window pressure
- Could hit token limits before summarization triggers, or summarize unnecessarily

**Desired behavior:**
- Thresholds should be token-based, not message-based
- Recent window should be "messages within last N tokens" rather than "last N messages"
- Ensure we never cut a message in the middle - keep complete messages
- Still maintain the three-bucket system (summarized, old, recent)

**Implementation notes:**
- Update `context.service.ts` to calculate token counts per message
- Define `RECENT_WINDOW_TOKENS` (e.g., 2000 tokens) instead of `RECENT_WINDOW_SIZE` (5 messages)
- Walk backward from latest message, accumulating tokens until threshold reached
- Include all messages that fit within the token budget
- May need to adjust `SUMMARIZATION_THRESHOLD` based on testing
- Update logging to show token distribution: "Recent: N messages (X tokens), Old: M messages (Y tokens)"

**Acceptance criteria:**
- [ ] Recent window determined by token count, not message count
- [ ] Messages never split mid-content
- [ ] Summarization triggers based on total token pressure
- [ ] Token counts logged for visibility
- [ ] Manual testing shows improved handling of varied message lengths

---

### 2. Password Visibility Toggle ✅ COMPLETE

**Current behavior:**
- Password fields on sign-up and sign-in pages don't have a visibility toggle
- Users must type password blind, making it easy to mistype

**Problem:**
- Especially on sign-up, users can't verify they typed what they intended
- Common UX pattern that users expect
- Frustrating when password is rejected due to typo

**Desired behavior:**
- Add eye icon to all password fields (sign-up, sign-in, password reset)
- Click to toggle between masked and visible password
- Icon should indicate current state (open eye = visible, closed eye = masked)

**Implementation notes:**
- Could use Radix UI's approach or a simple button element
- Need to toggle input type between `password` and `text`
- Ensure icon is accessible (proper aria-label)
- Common pattern: eye icon on the right side of the input field

**Implementation completed:**
- Created `PasswordInput` component (`src/components/ui/PasswordInput.tsx`) with built-in visibility toggle
- Toggle button positioned absolutely on right side of input field
- Icon state: Eye icon (password visible) / EyeOff icon (password hidden)
- Button includes `aria-label` for screen reader accessibility (e.g., "Show password")
- Replaced all password input fields in `EmailSignInForm`, `SignUpPage`, and `ResetPasswordPage`
- Used CSS custom property `--color-border-subtle` for icon color consistency
- Simplified className logic to avoid empty string edge case

**Acceptance criteria:**
- [x] Eye icon present on all password fields
- [x] Clicking toggles password visibility
- [x] Icon indicates current state
- [x] Accessible to screen readers
- [x] Works on both desktop and mobile

---

### 3. Google Sign-In Button with Brand Icon

**Current behavior:**
- "Continue with Google" button is text-only
- No visual branding to reinforce it's Google OAuth

**Problem:**
- Less recognizable as Google sign-in without the logo
- Doesn't follow Google's brand guidelines for sign-in buttons
- Less visually appealing and trustworthy

**Desired behavior:**
- Include Google's "G" logo on the sign-in button
- Follow Google's button design guidelines
- Should be recognizable at a glance as Google OAuth

**Implementation notes:**
- Google provides official SVG assets for sign-in buttons
- Could use the "G" logo or full "Sign in with Google" branded button
- Ensure proper licensing/usage (Google's brand guidelines allow this)
- SVG should be accessible (proper alt text or aria-label)
- Consider color scheme (white background with colored G is standard)

**Acceptance criteria:**
- [ ] Google logo/branding visible on button
- [ ] Follows Google's brand guidelines
- [ ] Works across different viewport sizes
- [ ] Accessible
- [ ] Looks polished and professional

---

### 4. Fix PostgreSQL SSL Mode Warning

**Current behavior:**
- `pg` library showing security warning about SSL mode deprecation
- Warning: SSL modes 'prefer', 'require', and 'verify-ca' treated as aliases for 'verify-full'
- In pg v9.0.0, these will adopt weaker libpq semantics

**Problem:**
- Security warning on every server startup
- Potential security downgrade when upgrading to pg v9
- Need to prepare for breaking change now

**Desired behavior:**
- Explicitly use `sslmode=verify-full` in database connection string
- No deprecation warnings
- Future-proof against pg v9 breaking changes

**Implementation notes:**
- Update DATABASE_URL to include `?sslmode=verify-full` (or append to existing query params)
- Check both local `.env` and Vercel environment variables
- Neon should support verify-full mode by default
- See: https://www.postgresql.org/docs/current/libpq-ssl.html

**Acceptance criteria:**
- [ ] DATABASE_URL includes explicit `sslmode=verify-full`
- [ ] No SSL mode warnings in local development
- [ ] No SSL mode warnings in production (Vercel logs)
- [ ] Database connections still work correctly
- [ ] Updated in both local and production environments

---

### 5. Fix Resend Domain Verification Error

**Current behavior:**
- Better Auth attempts to send verification emails via Resend
- Emails fail with error: "The telltale.app domain is not verified"
- Background task error logged on every email/password sign-up

**Problem:**
- Email/password authentication completely broken
- Users can't verify their email addresses
- No verification emails being sent
- Resend requires domain verification before sending

**Desired behavior:**
- Resend domain verified in Resend dashboard
- Verification emails send successfully
- Email/password sign-up flow works end-to-end

**Implementation notes:**
- **Option 1 (Production):** Verify telltale.app domain in Resend dashboard
  - Add DNS records (SPF, DKIM, etc.)
  - Wait for verification
  - Update environment variables if needed
- **Option 2 (Development):** Use Resend's test mode or verified sender email
  - For local testing, may use personal verified email
  - Not suitable for production
- Check Better Auth email configuration in `src/server/auth.ts`
- Verify `RESEND_API_KEY` environment variable is set correctly

**Acceptance criteria:**
- [ ] Domain verified in Resend dashboard (production)
- [ ] Verification emails send successfully
- [ ] No "domain is not verified" errors in logs
- [ ] Email/password sign-up flow tested end-to-end
- [ ] Both local and production environments working

---

### 6. Sign-In User Feedback

**Current behavior:**
- Sign-in forms (email/password and Google OAuth) don't show any loading state during authentication
- No indication to user that their click was registered
- No feedback while waiting for server response
- Form just sits idle until redirect or error occurs

**Problem:**
- Users don't know if their sign-in attempt is processing
- On slow connections, appears broken or unresponsive
- No feedback creates uncertainty - did my click work?
- Common UX pattern that users expect during async operations

**Desired behavior:**
- Show loading state on sign-in button when clicked
- Disable form inputs during authentication
- Display loading spinner or "Signing in..." text
- Provide immediate visual feedback that action is processing
- On error, show clear error message and reset form to usable state

**Implementation notes:**
- Track loading state in sign-in components (`useState` or form library state)
- Disable button and show spinner during `signIn.email()` or `signIn.social()` calls
- Consider using the button's disabled state + loading variant
- Ensure loading state resets on error
- Could add optimistic UI (e.g., "Redirecting..." before actual redirect)
- Test both success and error paths to ensure state resets properly

**Acceptance criteria:**
- [ ] Sign-in button shows loading state when clicked
- [ ] Form inputs disabled during authentication
- [ ] Clear visual indication that sign-in is processing
- [ ] Loading state clears on error with error message shown
- [ ] Works for both email/password and Google OAuth flows
- [ ] No stuck loading states if request fails

---

### 7. Add Login/Sign-Up Links to Landing Page ✅ COMPLETE

**Current behavior:**
- Main landing page at telltalestories.com exists as a placeholder
- No navigation or links to sign-in or sign-up pages
- Users who land on the homepage have no clear path to authenticate

**Problem:**
- Even though it's a placeholder, users need a way to access the app
- No call-to-action or next step for visitors
- Have to manually navigate to /sign-in or /sign-up URLs
- Poor first impression and user experience

**Desired behavior:**
- Add clear, prominent links/buttons to sign-in and sign-up pages
- Could be a simple nav bar or hero section with CTAs
- "Sign In" and "Sign Up" buttons/links that are easy to find
- Simple but functional - doesn't need to be the final marketing page

**Implementation notes:**
- Update the landing page component (likely `app/page.tsx`)
- Add navigation links in header or prominent CTAs in hero section
- Use consistent button styling with auth pages
- Could be as simple as: "Welcome to Telltale Stories" + "Sign In" / "Sign Up" buttons
- Consider the logged-in state - redirect to dashboard if already authenticated

**Implementation completed:**
- Added Sign Up (primary button) and Sign In (secondary button) links below hero text
- Implemented session check to redirect authenticated users to dashboard
- Applied responsive design with flex layout (stacks vertically on mobile)
- Used CSS custom properties for theming consistency
- Also fixed TypeScript import in `scripts/add-question.ts` (Database → DB type)

**Acceptance criteria:**
- [x] "Sign In" link/button visible on landing page
- [x] "Sign Up" link/button visible on landing page
- [x] Links navigate to correct auth pages
- [x] Works on both desktop and mobile viewports
- [x] Logged-in users redirected to dashboard

---

### 8. Dashboard UI Cleanup

**Current behavior:**
- Dashboard exists and is functional
- Current UI is rough/unpolished
- Doesn't look good in its current state

**Problem:**
- Poor visual presentation undermines the app's credibility
- Users' first impression after signing in is important
- Current state is too rough even for early testing
- Basic polish goes a long way for user confidence

**Desired behavior:**
- Clean up the dashboard layout and styling
- Not a full redesign, just polish what's there
- Better spacing, typography, visual hierarchy
- Make it presentable and pleasant to use
- Maintain functionality while improving appearance

**Implementation notes:**
- Review current dashboard component layout
- Apply consistent spacing/padding
- Improve typography (font sizes, weights, hierarchy)
- Better visual separation between sections
- Consider card-based layouts for book/interview lists
- Use existing CSS Modules/Radix patterns from other pages
- Focus on readability and clean presentation
- Don't need to add new features, just polish existing UI

**Acceptance criteria:**
- [ ] Dashboard has clean, consistent spacing
- [ ] Typography is readable with clear hierarchy
- [ ] Visual elements are well-organized
- [ ] Layout works on different screen sizes
- [ ] Overall appearance is presentable and professional
- [ ] No new functionality required, just visual polish

---

## Future Items

_(Add new enhancements below as they're discovered during testing)_

---

## Notes

- Keep enhancements focused and scoped - if something grows large, consider making it a separate phase/plan
- Test each enhancement thoroughly before moving to the next
- Update this document with implementation details and learnings as work progresses
