# Manual Test Plan: 2a Core Memory Block

**Purpose:** Validate end-to-end core memory behavior against a running app with a real database.

**Prerequisites:**
- Local dev environment running (`npm run dev`)
- Database access (e.g., `psql` or a GUI client connected to the local Postgres)
- A registered user account

---

## SQL Helpers

Use these throughout testing. Replace `<bookId>` and `<interviewId>` with actual values.

```sql
-- Book's core memory (preview + length)
SELECT id, title, LEFT("coreMemory", 500) AS memory_preview,
       LENGTH("coreMemory") AS memory_length
FROM book WHERE id = '<bookId>';

-- Full core memory text
SELECT "coreMemory" FROM book WHERE id = '<bookId>';

-- List interviews for a book
SELECT id, topic, status, "createdAt"
FROM interview WHERE "bookId" = '<bookId>' ORDER BY "createdAt";

-- Recent messages in an interview
SELECT role, LEFT(content, 100) AS content_preview, hidden, "createdAt"
FROM message WHERE "interviewId" = '<interviewId>'
ORDER BY "createdAt" DESC LIMIT 10;
```

---

## Scenario 1: First Interview — Memory Bootstrap

**Goal:** Verify that `coreMemory` starts NULL and gets populated on the first AI response.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Create a new book | Book appears on dashboard |
| 2 | Query DB: `SELECT "coreMemory" FROM book WHERE id = '<bookId>'` | `coreMemory` is NULL |
| 3 | Start interview #1 (pick any topic) | Interview UI loads |
| 4 | Send the first user message (mention a person's name and a place) | AI responds |
| 5 | Query DB: full core memory | `coreMemory` is now populated. Contains both `## Book Memory` and `## Interview Memory` sections |
| 6 | Send 3-4 more messages mentioning names, places, emotions, dates | AI responds to each |
| 7 | Query DB after each message | **Book Memory** accumulates people/places/narrative details. **Interview Memory** tracks current threads and topics explored |

**What to look for:**
- Book Memory captures durable facts (names, relationships, places)
- Interview Memory reflects the conversational flow (active threads, topics covered)
- Both sections are present in every update

---

## Scenario 2: Multi-Turn Memory Evolution

**Goal:** Verify memory evolves sensibly over many turns without growing unbounded.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Continue interview #1 from Scenario 1 — send 5+ more messages | AI responds to each |
| 2 | Query DB after each message: check `LENGTH("coreMemory")` | Total length stays roughly in the 800-1,500 character range |
| 3 | Compare Book Memory across turns | Book Memory only changes when new durable information is learned — not every single turn |
| 4 | Compare Interview Memory across turns | Interview Memory updates more freely — current thread shifts, active threads change |

**What to look for:**
- Memory doesn't grow without bound
- Book Memory is stable (edits are additive, not rewritten from scratch each turn)
- Interview Memory reflects the current state of the conversation

---

## Scenario 3: Cross-Interview Continuity

**Goal:** Verify Book Memory persists across interviews and Interview Memory resets.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Complete interview #1 (or just leave it and start a new one) | — |
| 2 | Query DB: save a copy of the full `coreMemory` from interview #1 | Reference for comparison |
| 3 | Start interview #2 on the **same book** with a **different topic** | Interview UI loads |
| 4 | Query DB: check `coreMemory` before sending any messages | Book Memory section is **preserved** from interview #1. Interview Memory section is **reset** — contains only the new topic context |
| 5 | Send a message in interview #2 that relates to people/events from interview #1 | AI response references details from interview #1 (names, places, etc.) |
| 6 | Query DB: check `coreMemory` | Book Memory still has interview #1 knowledge. Interview Memory now reflects interview #2's conversation |

**What to look for:**
- Book Memory carries over — the AI "remembers" across interviews
- Interview Memory is scoped to the current interview only
- The AI's responses demonstrate awareness of prior interview content

---

## Scenario 4: Parse Failure Resilience

**Note:** This is difficult to trigger manually because the LLM nearly always returns valid JSON. This scenario is fully covered by automated tests.

**Expected behavior if it ever occurs in the wild:**
- Existing `coreMemory` on the book is preserved (not cleared or corrupted)
- The AI's response text is returned as-is to the user
- No error is shown to the user

---

## Scenario 5: Redirect Preserves Memory

**Goal:** Verify that using the "explore a different aspect" redirect doesn't lose memory.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Start a new interview (or continue an existing one) and send a few messages | Memory is populated |
| 2 | Query DB: note the current `coreMemory` | Reference for comparison |
| 3 | Click the redirect button ("explore a different aspect") | AI responds with a new direction |
| 4 | Query DB: check `coreMemory` | Memory is **updated** (not lost or reset). Book Memory should still contain all previously learned facts |

**What to look for:**
- Redirect triggers a normal memory update, not a reset
- No data loss from the redirect flow

---

## Scenario 6: Abandoned Interview Recovery

**Goal:** Verify that knowledge from an abandoned interview is preserved in Book Memory.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Start interview #3 on a book, send 3-4 messages with new facts | Memory is populated with new details |
| 2 | Query DB: note `coreMemory` — confirm Book Memory has the new facts | — |
| 3 | **Do not complete** interview #3 — go back to the book page | Interview stays in ACTIVE status |
| 4 | Start interview #4 on the same book with a different topic | Interview UI loads |
| 5 | Query DB: check `coreMemory` | Book Memory **retains** knowledge from interview #3. Interview Memory is **reset** for interview #4 |
| 6 | Send a message in interview #4 | AI references details learned during interview #3 |

**What to look for:**
- Abandoning an interview doesn't lose any Book Memory
- Starting a new interview correctly resets only Interview Memory

---

## Pass Criteria

All scenarios pass when:
1. `coreMemory` bootstraps from NULL on first message
2. Book Memory accumulates durable facts and persists across interviews
3. Interview Memory resets when a new interview starts
4. Memory stays bounded (roughly 800-1,500 characters)
5. Redirects update memory normally
6. Abandoned interviews don't lose Book Memory
