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

### 2. Password Visibility Toggle

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

**Acceptance criteria:**
- [ ] Eye icon present on all password fields
- [ ] Clicking toggles password visibility
- [ ] Icon indicates current state
- [ ] Accessible to screen readers
- [ ] Works on both desktop and mobile

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

## Future Items

_(Add new enhancements below as they're discovered during testing)_

---

## Notes

- Keep enhancements focused and scoped - if something grows large, consider making it a separate phase/plan
- Test each enhancement thoroughly before moving to the next
- Update this document with implementation details and learnings as work progresses
