# Manual Testing Guide

Last updated: 2026-02-21

This guide covers manual testing for all features completed through Phase 0 and Phase 1 (core conversation).

## Quick Start

1. **Local environment:** `npm run dev` (http://localhost:3000)
2. **Deployed environment:** Check Vercel deployment URL
3. **Test database:** Use a separate test user account for destructive operations

---

## 1. Authentication Flows

### 1.1 Google OAuth Sign-In

**Steps:**
1. Navigate to `/login`
2. Click "Continue with Google"
3. Complete Google OAuth flow
4. Verify redirect to homepage/dashboard
5. Verify session persists on page reload
6. Sign out, verify redirect to login

**Expected behavior:**
- Seamless OAuth flow with no errors
- User account created on first sign-in
- Session cookie set and persists
- Sign-out clears session

### 1.2 Email/Password Sign-Up

**Steps:**
1. Navigate to `/login`
2. Enter email: `testuser+${timestamp}@example.com`
3. Enter password: `SecurePass123!`
4. Click "Sign up"
5. Check email for verification link
6. Click verification link
7. Verify redirect and sign-in

**Expected behavior:**
- Validation errors for weak passwords
- Validation errors for invalid email formats
- Email sent with verification link
- Account activated after email verification

### 1.3 Email/Password Sign-In

**Steps:**
1. Navigate to `/login`
2. Enter existing email
3. Enter correct password
4. Click "Sign in"
5. Verify redirect to dashboard

**Expected behavior:**
- Error message for incorrect password
- Error message for non-existent account
- Successful sign-in with correct credentials

### 1.4 Password Reset

**Steps:**
1. Navigate to `/login`
2. Click "Forgot password?"
3. Enter registered email
4. Check email for reset link
5. Click reset link
6. Enter new password
7. Submit and verify redirect
8. Sign in with new password

**Expected behavior:**
- Reset email sent to valid addresses
- Graceful handling of non-existent emails (no leak)
- Token expires after use
- New password works immediately

---

## 2. Core Interview Flow

### 2.1 Book Creation

**Steps:**
1. Sign in as authenticated user
2. Navigate to dashboard
3. Click "Create New Book"
4. Enter title: "My Life Story"
5. Enter description (optional): "A collection of memories from my childhood"
6. Submit form

**Expected behavior:**
- Book appears in dashboard
- Ownership tied to authenticated user
- Cannot access other users' books

### 2.2 Interview Creation

**Steps:**
1. Open a book from dashboard
2. Click "Start New Interview"
3. Select or enter a question (see sample questions below)
4. Submit to start interview

**Expected behavior:**
- Interview session created
- First AI response arrives with follow-up question
- Session persisted to database

### 2.3 Conversation Flow

**Steps:**
1. Start an interview (see 2.2)
2. Respond with sample answers (see Section 3 below)
3. Continue for 5-10 message exchanges
4. Verify AI follow-ups are contextually relevant
5. Navigate away and return - verify conversation persists

**Expected behavior:**
- AI asks relevant follow-up questions
- Conversation feels natural, not robotic
- Context maintained across turns
- Typing indicators (if implemented)
- Error handling for API failures

---

## 3. Sample Interview Questions & Answers

Use these scenarios to test different conversation dynamics and edge cases.

### 3.1 Rich, Detailed Answers (Should Not Need Much Probing)

**Question:** "Tell me about your first car."

**Sample Answer (Detailed):**
> "My first car was a 1998 Honda Civic DX in forest green that I bought from a family friend in 2004 when I was 17. I paid $2,800 for it, which was every penny I'd saved from my summer job at the ice cream shop. The car had 145,000 miles on it, a manual transmission that I had to learn how to drive, and a cassette player that still worked. I remember stalling it at every red light for the first two weeks. My dad would ride with me in empty parking lots on Sunday mornings, patiently teaching me to feel the clutch. The car had this quirk where the passenger window would only roll down about two-thirds of the way, and there was a mysterious rattle in the dashboard that I never figured out. I drove that car all through college, and even though it was old and quirky, I loved it. It represented freedom to me."

**Expected AI behavior:**
- Should recognize this is a complete, rich story
- May ask one or two follow-up questions to deepen specific details (e.g., "What happened to the car eventually?" or "Were there any memorable road trips you took in it?")
- Should move to extract insights or shift to related topics
- Should NOT ask basic questions like "What color was it?" (already answered)

---

### 3.2 Brief Answers (Should Trigger Probing)

**Question:** "Tell me about your relationship with your grandparents."

**Sample Answer (Brief):**
> "I was really close with my grandmother on my mom's side."

**Expected AI behavior:**
- Should ask multiple follow-up questions:
  - "What was your grandmother's name?"
  - "What made you close with her?"
  - "Do you have a specific memory that stands out?"
  - "What about your other grandparents?"
- Should gently probe without feeling interrogative
- Should encourage storytelling

**Sample Follow-Up Answers:**

*User:* "Her name was Rose. She lived with us when I was little."

*AI should continue:* "What was it like having Rose live with you?" or "What are some things you remember doing together?"

*User:* "She used to make these incredible apple pies from scratch. I'd help her peel the apples."

*AI should probe deeper:* "Tell me more about making pies with Rose. What do you remember about those times?"

*User:* "It was every Sunday afternoon. She'd let me use this old peeler that was kind of dangerous. We'd listen to big band music on her radio."

*AI should recognize story emerging:* Might ask about sensory details, emotional significance, or what happened to this tradition.

---

### 3.3 Multi-Story Topics (Same Theme, Multiple Threads)

**Question:** "What were family dinners like when you were growing up?"

**Sample Answer (Surface Level):**
> "We always ate together at 6pm sharp. My dad was really strict about it."

**Expected AI behavior:**
- Should recognize multiple potential story threads
- Should help user explore different angles:
  - The strict dinner rule (why? what happened if you were late?)
  - Typical meals (who cooked? favorite dishes?)
  - Dinner conversations (what did you talk about?)
  - Special occasions vs. regular nights
  - How this changed as you got older

**Sample Multi-Turn Exploration:**

*User:* "We always ate together at 6pm sharp. My dad was really strict about it."

*AI:* "What happened if someone wasn't there at 6pm?"

*User:* "Oh man, my brother got grounded once for being ten minutes late. Dad didn't mess around."

*AI:* "That sounds like dinner time was important to your father. What do you think it meant to him?"

*User:* "I think it was his way of keeping the family together. He worked long hours, so dinner was sacred time."

*AI:* "What was the atmosphere like at these dinners? What do you remember talking about?"

*User:* "We had this rule where we each had to share one thing from our day. My little sister always had the most dramatic stories about elementary school."

*AI:* "Can you remember one of your sister's stories that stands out?"

[Continue probing different aspects: the food, seating arrangements, how dinners changed over time, conflicts, celebrations, etc.]

**Expected AI behavior across this thread:**
- Should identify multiple sub-stories within the broader topic
- Should help user explore different time periods ("How did this change when you became a teenager?")
- Should connect emotional threads (family closeness, father's values, sibling dynamics)
- Should balance between depth on one thread and breadth across different aspects
- Should eventually extract insights about family values, relationship patterns, formative experiences

---

### 3.4 Emotionally Significant Topics (Handle with Care)

**Question:** "Tell me about a time you experienced loss."

**Sample Answer (Tentative):**
> "My best friend from high school died in a car accident our senior year."

**Expected AI behavior:**
- Should acknowledge the weight of the topic
- Should give user control: "I'm sorry for your loss. Would you like to share some memories of your friend?"
- Should NOT push too hard if user seems hesitant
- Should follow user's emotional lead
- Should recognize when to extract insights vs. when to sit with the story

**Sample Follow-Up Answers:**

*User:* "Yeah. His name was Marcus. It happened two weeks before graduation."

*AI:* "That must have been devastating. What's a memory of Marcus that you hold onto?"

*User:* "He had this ridiculous laugh that would make everyone else start laughing. We'd get in trouble in class all the time."

*AI:* Should validate and gently continue, not pivot away from emotion: "It sounds like Marcus brought a lot of joy to the people around him. How did you get through those last weeks of school?"

---

### 3.5 Vague or Uncertain Answers (Needs Gentle Redirection)

**Question:** "What's your earliest memory?"

**Sample Answer (Vague):**
> "I don't know, maybe something from when I was three? I'm not really sure if it's a real memory or something I saw in photos."

**Expected AI behavior:**
- Should validate uncertainty: "That's common - it can be hard to know what we truly remember vs. what we've been told. What's the image or feeling that comes to mind?"
- Should help user explore without pressure
- Should offer alternative angles: "Is there a memory from early childhood that feels more solid to you?"

---

### 3.6 Tangential or Off-Topic Answers (Needs Gentle Steering)

**Question:** "Tell me about your wedding day."

**Sample Answer (Off-topic):**
> "Well, we got married in 2015, but actually the whole wedding industry is such a scam. Did you know the average wedding costs $30,000 now? It's ridiculous."

**Expected AI behavior:**
- Should acknowledge but redirect: "It definitely can be expensive! What was your wedding like - did you have a big celebration or something smaller?"
- Should steer back to personal narrative
- Should NOT get drawn into abstract discussions

---

## 4. Context Window & Summarization

### 4.1 Long Conversation Test

**Steps:**
1. Start an interview
2. Continue conversation for 20+ message exchanges (use detailed answers)
3. Verify summarization kicks in at appropriate threshold
4. Check that AI maintains context from earlier in conversation
5. Reference something from early in conversation to verify it's accessible

**Expected behavior:**
- Older messages get summarized (check database or logs)
- AI can still reference key details from earlier
- No sudden loss of context
- Insights from earlier remain accessible
- Performance remains responsive

### 4.2 Insight Injection Test

**Steps:**
1. Complete one interview with rich stories
2. Verify insights were extracted (check database)
3. Start a new interview on related topic
4. Observe if AI references insights from first interview

**Expected behavior:**
- Insights extracted and stored
- Related insights surfaced in new conversations
- Connections made between different interviews
- Insights feel natural, not forced

---

## 5. Edge Cases & Error Handling

### 5.1 Network Interruption

**Steps:**
1. Start interview
2. Disable network mid-response
3. Re-enable network
4. Attempt to continue

**Expected behavior:**
- Graceful error message
- Ability to retry
- No lost messages
- No corrupted state

### 5.2 Very Long User Responses

**Test Input:**
Paste a 2000+ word story as a single message.

**Expected behavior:**
- System handles without crashing
- AI responds appropriately to long-form content
- No truncation of user input

### 5.3 Rapid-Fire Messages

**Steps:**
1. Send multiple messages quickly without waiting for responses
2. Observe queuing behavior

**Expected behavior:**
- Messages queued appropriately
- No race conditions
- Responses in correct order

### 5.4 Special Characters & Formatting

**Test Inputs:**
- Emojis: "My dog 🐕 was the best!"
- Line breaks: "First paragraph.\n\nSecond paragraph."
- Quotes: "She said, \"I'll never forget this.\""
- Code-like text: "My password was literally `password123`"

**Expected behavior:**
- All characters preserved
- Formatting maintained
- No injection vulnerabilities
- AI handles gracefully

---

## 6. Multi-User & Permissions

### 6.1 Data Isolation

**Steps:**
1. Create book and interview as User A
2. Note the interview URL
3. Sign out
4. Sign in as User B
5. Attempt to access User A's interview URL directly

**Expected behavior:**
- User B cannot access User A's data
- Appropriate error/redirect (404 or unauthorized)
- No data leakage

### 6.2 Concurrent Users

**Steps:**
1. Sign in as User A on Chrome
2. Sign in as User B on Firefox
3. Both create interviews simultaneously
4. Both have active conversations

**Expected behavior:**
- No conflicts
- Each user's data isolated
- No cross-contamination of responses

---

## 7. Performance & Responsiveness

### 7.1 AI Response Time

**Steps:**
1. Send a message
2. Time the response

**Expected behavior:**
- Response within 3-10 seconds (varies by model)
- Loading indicators appear
- Graceful handling if response takes longer

### 7.2 Dashboard Load Time

**Steps:**
1. Create 10+ books with 5+ interviews each
2. Load dashboard
3. Measure time to interactive

**Expected behavior:**
- Dashboard loads within 2 seconds
- Pagination or lazy loading if needed
- No performance degradation with more data

---

## 8. Recommended Test Session Flow

**Session 1: Happy Path (30 minutes)**
1. Sign up with email/password
2. Create book: "Childhood Memories"
3. Start interview with Question 3.1 (first car) - use detailed answer
4. Continue for 3-4 exchanges
5. Start second interview with Question 3.2 (grandparents) - use brief answers to test probing
6. Complete 8-10 exchanges, let AI probe deeply
7. Review both conversations for quality

**Session 2: Multi-Story Exploration (45 minutes)**
1. Sign in with existing account
2. Create book: "Family Stories"
3. Start interview with Question 3.3 (family dinners)
4. Use the multi-turn exploration script
5. Let conversation branch into at least 3 sub-stories
6. Verify insights are being extracted
7. Test context retention by referencing earlier details

**Session 3: Edge Cases & Stress Test (30 minutes)**
1. Test all edge cases from Section 5
2. Test very long conversation (20+ turns)
3. Test rapid topic switching
4. Test emotionally significant topic handling (Section 3.4)
5. Verify data isolation with second test account

**Session 4: Full User Journey (60 minutes)**
1. Fresh account, pretend to be a real user
2. Create 2-3 books on different life areas
3. Conduct 5-6 interviews with varied question types
4. Use realistic, unscripted answers
5. Evaluate overall experience: Is this compelling? Would you continue?

---

## 9. Logging & Debugging

During manual testing, keep notes on:
- Any AI responses that feel off or irrelevant
- Questions that feel too generic or too specific
- Moments where context seems lost
- Insights that were extracted (do they make sense?)
- Performance hiccups or delays
- Any UI/UX friction points

**Useful debugging commands:**
```bash
# Check recent database changes
npm run db:studio

# View server logs
npm run dev (watch console)

# Check production logs
(Vercel dashboard or logging provider)
```

---

## 10. Sign-Off Checklist

Before considering manual testing complete:

- [ ] All auth flows tested (Google OAuth, email sign-up, sign-in, password reset)
- [ ] At least 5 complete interview sessions conducted
- [ ] All sample question types tested (3.1 through 3.6)
- [ ] Long conversation test completed (20+ turns)
- [ ] Edge cases tested (Section 5)
- [ ] Multi-user isolation verified
- [ ] Performance acceptable across all features
- [ ] No critical bugs or data loss issues
- [ ] Conversation quality meets expectations
- [ ] Insights extraction working as expected
- [ ] Context window management working smoothly

---

## Notes

- **Database resets:** For testing, you may want to periodically reset test data. Be careful not to reset production!
- **Email testing:** Use a service like Gmail with `+` tags (e.g., `yourname+test1@gmail.com`) to create multiple test accounts
- **Conversation quality:** This is subjective but critical. Does the AI feel like a thoughtful interviewer, or a robotic question machine?
- **Mobile testing:** Don't forget to test on mobile browsers - interview conversations should work well on phones
