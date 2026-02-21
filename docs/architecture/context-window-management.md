# Context Window Management

**Status:** Active (Plan 1.6)
**Related:** ADR 018 (Insight Context Placement)

## Problem

LLM context windows are finite and expensive. As conversations grow longer:
- **Cost increases:** Every message sent to the LLM costs tokens
- **Latency increases:** More tokens = slower processing
- **Context limits:** Eventually hit the model's maximum context window

Without management, a 50-message conversation sends all 50 messages on every turn, wasting tokens on old exchanges that provide diminishing value.

## Solution: Three-Bucket Sliding Window

We use a **three-bucket sliding window** strategy optimized for long-form storytelling:

```
[== already_summarized ==][== old (accumulating) ==][== recent (verbatim) ==]
   (compressed in summary)    (waiting for batch)         (last 5 messages)
```

### The Three Buckets

**1. Recent (verbatim)**
- Last 5 messages, kept word-for-word
- Fixed window size
- High fidelity for immediate context

**2. Old (accumulating)**
- Messages that aged out of recent
- Accumulate until we have a batch (5 messages)
- Then get summarized and moved to already_summarized

**3. Already Summarized (compressed)**
- All messages covered by existing InterviewSummary records
- Represented as prose summary, not individual messages
- Count tracked in InterviewSummary.messageCount

### How Messages Flow

```
New message arrives
   ↓
Added to recent window
   ↓
Oldest message in recent pops off
   ↓
Moves to old bucket (accumulates)
   ↓
When old bucket reaches 5 messages
   ↓
Summarize those 5 messages
   ↓
Move to already_summarized (via InterviewSummary record)
   ↓
Reset old bucket to empty
```

## Key Thresholds

### Constants

```typescript
MAX_CONTEXT_TOKENS = 16000             // Hard limit (model capacity)
SUMMARIZATION_THRESHOLD = 8000         // Trigger point for starting summarization
RECENT_WINDOW_SIZE = 5                 // Keep last 5 messages verbatim
SUMMARIZATION_BATCH_SIZE = 5           // Summarize when 5 messages accumulate
```

### Why These Numbers?

**RECENT_WINDOW_SIZE = 5**
- Optimized for long-form storytelling
- User messages contain rich, detailed narratives
- 5 recent messages provide strong immediate context without bloating token count

**SUMMARIZATION_BATCH_SIZE = 5**
- Summarize frequently enough to keep context manageable
- Large enough to create meaningful summaries (not just 1-2 messages)
- Means we summarize every 5 messages after initial window fills

**SUMMARIZATION_THRESHOLD = 8000 tokens**
- When total context exceeds this, we start the sliding window strategy
- Conservative threshold (half of max) to leave room for responses

### Trigger Logic

```typescript
// Split messages into buckets
const recentMessages = allMessages.slice(-RECENT_WINDOW_SIZE);  // Last 5
const alreadySummarizedCount = existingSummary?.messageCount ?? 0;
const oldMessages = allMessages.slice(alreadySummarizedCount, -RECENT_WINDOW_SIZE);

// Should we summarize?
if (oldMessages.length >= SUMMARIZATION_BATCH_SIZE) {
  // Yes - create new summary covering oldMessages
  // New messageCount = alreadySummarizedCount + oldMessages.length
}
```

## Examples

### Example 1: No Messages (Edge Case)

**Scenario:** Brand new interview, `buildContextWindow()` called before any messages exist

**State:**
- Total messages: 0
- Total tokens: ~500 (system prompt only)
- Buckets: recent=[], old=[], already_summarized=none

**Behavior:**
- Under threshold (no split needed)
- Returns: `{ systemPrompt, messages: [] }`

**What gets sent to LLM:**
```
SYSTEM: You are a skilled life story interviewer...
```

---

### Example 2: First Turn (Topic Message)

**Scenario:** `startInterview` has persisted the topic message

**State:**
- Total messages: 1
- Total tokens: ~600
- Buckets: recent=[1], old=[], already_summarized=none

**Behavior:**
- Under threshold (no split needed)
- Returns: `{ systemPrompt, messages: [message1] }`

**What gets sent to LLM:**
```
SYSTEM: You are a skilled life story interviewer...

USER: The topic for this conversation is: childhood memories.
      Please greet the storyteller warmly and ask an opening question.
```

---

### Example 3: Short Conversation (5 Messages)

**Scenario:** Conversation has 5 messages

**State:**
- Total messages: 5
- Total tokens: ~3,000 (under 8K threshold)
- Buckets: recent=[1,2,3,4,5], old=[], already_summarized=none

**Behavior:**
- Under threshold (no split needed)
- All messages in recent window
- Insights injected before last message
- Returns: `{ systemPrompt, messages: [1,2,3,4,5 with insights] }`

**What gets sent to LLM:**
```
SYSTEM: You are a skilled life story interviewer...

USER: (message 1 - topic)
ASSISTANT: (message 2)
USER: (message 3)
ASSISTANT: (message 4)

ASSISTANT: [Previous interview notes]
- ENTITY: Elm Street in Ohio — childhood home
- EMOTION: nostalgia when describing the neighborhood

USER: (message 5)
```

---

### Example 4: Window Starting to Slide (8 Messages)

**Scenario:** Conversation has grown to 8 messages, now over threshold

**State:**
- Total messages: 8
- Total tokens: ~9,500 (over 8K threshold)
- Buckets: recent=[4,5,6,7,8], old=[1,2,3], already_summarized=none

**Behavior:**
- Over threshold → split into buckets
- recent = last 5 messages [4-8]
- old = messages before recent [1-3]
- Check: `old.length = 3 < 5` → **don't summarize yet** (need 5 to make a batch)
- Returns: `{ systemPrompt, messages: [1,2,3,4,5,6,7,8 with insights] }`

**What gets sent to LLM:**
```
SYSTEM: You are a skilled life story interviewer...

USER: (message 1)
ASSISTANT: (message 2)
USER: (message 3)
ASSISTANT: (message 4)
USER: (message 5)
ASSISTANT: (message 6)
USER: (message 7)
ASSISTANT: (message 8 - insights injected before this)
```

**Note:** Still sending all messages verbatim because old bucket hasn't filled yet.

---

### Example 5: First Summary (10 Messages)

**Scenario:** Conversation reaches 10 messages

**State:**
- Total messages: 10
- Total tokens: ~11,000
- Buckets: recent=[6,7,8,9,10], old=[1,2,3,4,5], already_summarized=none

**Behavior:**
- Split into buckets
- recent = [6-10]
- old = [1-5]
- Check: `old.length = 5 >= 5` → **SUMMARIZE!**
- Summarize messages 1-5 into prose
- Create InterviewSummary with `messageCount: 5`
- After summarization: recent=[6-10], old=[], already_summarized=summary(1-5, count=5)
- Returns: `{ systemPrompt, messages: [summary, 6,7,8,9,10 with insights] }`

**What gets sent to LLM:**
```
SYSTEM: You are a skilled life story interviewer...

ASSISTANT: To recap our earlier conversation: You grew up on Elm Street
in Ohio in the 1960s. You described your house with the big oak tree in
the front yard where you and your sister Teresa would play. You mentioned
your father ran the hardware store on Main Street...

USER: (message 6)
ASSISTANT: (message 7)
USER: (message 8)
ASSISTANT: (message 9)

ASSISTANT: [Previous interview notes]
- ENTITY: Teresa (sister) — played under oak tree
- DETAIL: Hardware store mentioned but not explored

USER: (message 10)
```

**Database:**
```
InterviewSummary {
  id: "sum_1"
  interviewId: "int_123"
  parentSummaryId: null      // First summary
  content: "You grew up on Elm Street in Ohio..."
  messageCount: 5            // Covers messages 1-5
}
```

---

### Example 6: Growing the Old Bucket (13 Messages)

**Scenario:** Conversation at 13 messages (3 messages since last summary)

**State:**
- Total messages: 13
- Buckets: recent=[9,10,11,12,13], old=[6,7,8], already_summarized=summary(1-5, count=5)

**Behavior:**
- Split into buckets
- recent = [9-13]
- already_summarized covers messages 1-5
- old = messages 6-8 (between summarized and recent)
- Check: `old.length = 3 < 5` → **don't summarize** (need 2 more)
- Use existing summary
- Returns: `{ systemPrompt, messages: [existing summary, 6,7,8,9,10,11,12,13 with insights] }`

**What gets sent to LLM:**
```
SYSTEM: You are a skilled life story interviewer...

ASSISTANT: To recap our earlier conversation: [summary of messages 1-5]

USER: (message 6)
ASSISTANT: (message 7)
USER: (message 8)
ASSISTANT: (message 9)
USER: (message 10)
ASSISTANT: (message 11)
USER: (message 12)

ASSISTANT: [Previous interview notes]
- ...

USER: (message 13)
```

**Note:** Messages 6-8 are in old bucket (not summarized yet), but still sent verbatim because we don't have enough for a batch.

---

### Example 7: Second Summary (15 Messages)

**Scenario:** Conversation reaches 15 messages

**State:**
- Total messages: 15
- Buckets: recent=[11,12,13,14,15], old=[6,7,8,9,10], already_summarized=summary(1-5, count=5)

**Behavior:**
- Split into buckets
- recent = [11-15]
- old = [6-10]
- Check: `old.length = 5 >= 5` → **SUMMARIZE!**
- Summarize messages 6-10, incorporating previous summary
- Create InterviewSummary with `messageCount: 10`, links to previous
- After summarization: recent=[11-15], old=[], already_summarized=summary(1-10, count=10)
- Returns: `{ systemPrompt, messages: [new summary, 11,12,13,14,15 with insights] }`

**What gets sent to LLM:**
```
SYSTEM: You are a skilled life story interviewer...

ASSISTANT: To recap our earlier conversation: [Updated summary incorporating
messages 1-10. Includes the Ohio childhood, the hardware store stories, and
the new details about your first day of school where you met Jimmy...]

USER: (message 11)
ASSISTANT: (message 12)
USER: (message 13)
ASSISTANT: (message 14)

ASSISTANT: [Previous interview notes]
- ENTITY: Jimmy (childhood best friend) — met on first day of school
- EVENT: First day of school story

USER: (message 15)
```

**Database:**
```
InterviewSummary {
  id: "sum_2"
  interviewId: "int_123"
  parentSummaryId: "sum_1"   // Links to first summary
  content: "Updated summary..."
  messageCount: 10           // Covers messages 1-10
}

// sum_1 still exists (linked list pattern)
InterviewSummary {
  id: "sum_1"
  parentSummaryId: null
  messageCount: 5
}
```

---

### Example 8: Summarization Failure Fallback (15 Messages)

**Scenario:** At 15 messages, summary should trigger but LLM fails

**State:**
- Total messages: 15
- Buckets: recent=[11-15], old=[6-10], already_summarized=summary(1-5)
- LLM summarization call fails (network error, timeout, etc.)

**Behavior:**
- Split into buckets normally
- old.length = 5 → attempt summarization
- Summarization **FAILS**
- **Fallback:** Truncate old bucket
  - Keep last `SUMMARIZATION_BATCH_SIZE` from old = last 5 from old = [6-10]
  - Keep all recent = [11-15]
  - Total sent: 10 messages (5 + 5)
- **Do NOT create InterviewSummary** (next turn will retry)
- Returns: `{ systemPrompt, messages: [6,7,8,9,10,11,12,13,14,15 with insights] }`

**What gets sent to LLM:**
```
SYSTEM: You are a skilled life story interviewer...

USER: (message 6)
ASSISTANT: (message 7)
USER: (message 8)
ASSISTANT: (message 9)
USER: (message 10)
ASSISTANT: (message 11)
USER: (message 12)
ASSISTANT: (message 13)
USER: (message 14)

ASSISTANT: [Previous interview notes]
- ...

USER: (message 15)
```

**Database:**
- No new InterviewSummary created
- Still only has sum_1 (messages 1-5)
- Next turn at 16 messages:
  - old = [6-11] (6 messages)
  - Will retry summarization (old.length >= 5)

---

### Example 9: Continuing the Pattern (20 Messages)

**Scenario:** Conversation continues to 20 messages

**State:**
- Total messages: 20
- Buckets: recent=[16-20], old=[11-15], already_summarized=summary(1-10, count=10)

**Behavior:**
- old.length = 5 → SUMMARIZE messages 11-15
- Create InterviewSummary with messageCount: 15
- After: recent=[16-20], old=[], already_summarized=summary(1-15, count=15)

**Pattern established:**
- Every 5 messages, we create a new summary
- Messages 1-5 → summarized at message 10
- Messages 6-10 → summarized at message 15
- Messages 11-15 → summarized at message 20
- Messages 16-20 → will be summarized at message 25
- And so on...

---

## Token Estimation

We use a simple heuristic for estimating tokens:

```typescript
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
```

**Why this works:**
- English text averages ~4 characters per token
- Good enough for threshold decisions
- ~10-20% error is acceptable (thresholds are conservative)

**What we estimate:**
- System prompt (~500 tokens)
- Summary (if exists, ~200-500 tokens)
- All messages in context (~varies by content)
- All insights (~20-50 tokens each)

**Logging:**
Every turn logs the token breakdown:
```typescript
console.log('[Context] Token breakdown:', {
  systemPrompt: 512,
  summary: 287,
  messages: 6234,
  insights: 145,
  total: 7178
});
```

This visibility helps detect:
- Summaries growing too large (incremental summarization degradation)
- Unexpectedly large messages
- Insight accumulation issues
- When to adjust thresholds

---

## Insight Injection

Insights are always injected **before the last user message**, regardless of conversation length.

**Why before the last message?**
- Keeps insights in the "high attention zone" at the end of context
- Avoids the "lost in the middle" problem as conversations grow
- Semantically clear: "review notes → respond to user's latest question"

**Insight role:**
- Injected as `role: 'assistant'` (the AI's own notes)
- More semantically accurate than `role: 'user'`
- See ADR 018 for placement rationale

**Example:**
```typescript
// For recent messages with insights:
[
  { role: 'user', content: 'Message N-2' },
  { role: 'assistant', content: 'Response N-2' },
  { role: 'user', content: 'Message N-1' },
  { role: 'assistant', content: 'Response N-1' },

  // Insights injected before last message
  { role: 'assistant', content: '[Previous interview notes]\n- ENTITY: ...\n- EVENT: ...' },

  { role: 'user', content: 'Message N' }  // Most recent message
]
```

---

## InterviewSummary Linked List

Summaries form a **linked list** via `parentSummaryId`:

```
sum_1 (messages 1-5, count=5)
  ↑
sum_2 (messages 1-10, count=10, references sum_1)
  ↑
sum_3 (messages 1-15, count=15, references sum_2)
```

**Why linked list?**
- Traceability: Can reconstruct how the summary evolved
- Debugging: Can see when/why summaries were created
- Future: Could "rewind" to an earlier summary if needed

**Incremental summarization:**
Each summary incorporates the previous summary plus new messages:

```typescript
// Creating sum_2 (when we have messages 6-10 in old bucket):
const summaryPrompt = `
Previous summary: ${sum_1.content}

New messages to incorporate:
USER: (message 6)
ASSISTANT: (message 7)
USER: (message 8)
ASSISTANT: (message 9)
USER: (message 10)

Please create an updated summary that incorporates both the previous
summary and these new messages.
`;
```

**Trade-off:**
- Efficiency: Don't re-summarize everything every time
- Risk: Early summary errors compound (if sum_1 loses details, sum_2 won't recover them)
- Acceptable: Token logging helps detect summary drift; small batch size (5) means less information loss per batch

---

## Flow Diagrams

### buildContextWindow Decision Tree

```
buildContextWindow(interviewId)
  │
  ├─ Load interview → null? → throw Error("Interview not found")
  ├─ Load messages (filter USER/ASSISTANT only)
  ├─ Load insights
  ├─ Load latest summary (if exists)
  │
  ├─ Estimate tokens (system + summary + messages + insights)
  ├─ Log token breakdown via console.log
  │
  ├─ Total < SUMMARIZATION_THRESHOLD (8000)?
  │   YES → Return all messages with insights (no split)
  │   NO  → Continue ↓
  │
  ├─ Split into three buckets:
  │   - recent = last 5 messages
  │   - already_summarized = existingSummary?.messageCount ?? 0
  │   - old = messages between already_summarized and recent
  │
  ├─ Check: old.length >= SUMMARIZATION_BATCH_SIZE (5)?
  │   NO  → Use existing summary (if any), return all old + recent messages
  │   YES → Continue ↓
  │
  ├─ Call LLM to summarize old messages
  │   SUCCESS → Create InterviewSummary (messageCount = already + old.length)
  │             Return summary + recent messages
  │   FAIL    → Truncate old to last 5 messages
  │             Return truncated old + recent (no summary record)
  │
  └─ Return { systemPrompt, messages }
```

### Message Flow (Detailed)

```
Messages 1-5:
  recent=[1,2,3,4,5], old=[], summarized=none
  Action: None (under threshold or old bucket not full)

Message 6 arrives:
  recent=[2,3,4,5,6], old=[1], summarized=none
  Action: None (old.length = 1 < 5)

Message 7-9 arrive:
  recent=[5,6,7,8,9], old=[1,2,3,4], summarized=none
  Action: None (old.length = 4 < 5)

Message 10 arrives:
  recent=[6,7,8,9,10], old=[1,2,3,4,5], summarized=none
  Action: SUMMARIZE! (old.length = 5 >= 5)
  Result: recent=[6-10], old=[], summarized=sum_1(1-5, count=5)

Message 11-14 arrive:
  recent=[10,11,12,13,14], old=[6,7,8,9], summarized=sum_1(count=5)
  Action: None (old.length = 4 < 5)

Message 15 arrives:
  recent=[11,12,13,14,15], old=[6,7,8,9,10], summarized=sum_1(count=5)
  Action: SUMMARIZE! (old.length = 5 >= 5)
  Result: recent=[11-15], old=[], summarized=sum_2(1-10, count=10)

Pattern continues every 5 messages...
```

---

## Edge Cases

### Empty Interview
- 0 messages
- Returns empty array
- Defensive handling (shouldn't happen in practice)

### Exactly at Window Size
- 5 messages total
- recent=[1-5], old=[], summarized=none
- No summarization (nothing in old bucket)

### Just Over Window Size
- 6 messages total
- recent=[2-6], old=[1], summarized=none
- No summarization (old bucket not full)

### Exactly at First Summary Trigger
- 10 messages
- recent=[6-10], old=[1-5], summarized=none
- old.length = 5 → Create first summary

### Messages Exactly Equal to Thresholds
- When old.length exactly equals 5 → Summarize (>= trigger)
- When recent has exactly 5 → Normal operation

### LLM Timeout During Summarization
- Summarization fails
- Fall back to truncation (last 5 from old + 5 recent = 10 total)
- Conversation continues without interruption
- Next turn will retry (old bucket will be 6 messages)

### Very Long Individual Messages
- Token estimation might underestimate
- Conservative thresholds provide buffer
- Logging shows actual token usage
- Can adjust thresholds if needed

### Insights Grow Very Large
- Token logging shows: `insights: 2000` (unusually high)
- Current behavior: Still includes all insights
- Future: May need insight pruning based on explored flag

---

## Future Considerations

### Book-Level Insights
When wiring cross-interview insights:
- Load book-level insights in `buildContextWindow`
- Inject alongside interview-specific insights
- May need separate token budgets for each type

### Insight Explored Tracking
When `explored` flag is implemented:
- Filter to only `explored: false` insights
- Reduces insight token count over time
- Keeps context focused on unexplored threads

### Summary Regeneration
If summary quality degrades:
- Could regenerate from original messages 1-N instead of incrementally
- Trade-off: One expensive operation vs many cheap ones
- Token logging helps detect when this is needed

### Adjusting Thresholds
Based on real usage:
- If summaries are too lossy: Increase RECENT_WINDOW_SIZE or SUMMARIZATION_BATCH_SIZE
- If context is too expensive: Decrease window sizes
- If user messages are shorter than expected: Increase RECENT_WINDOW_SIZE
- Token breakdown logging informs these decisions

### Parallel Conversations
If user has multiple active interviews:
- Each interview has its own summary chain
- Summaries are scoped by `interviewId`
- No cross-contamination

---

## Testing Strategy

### Unit Tests (context.service.test.ts)

Must cover all scenarios:
- ✅ Zero messages (edge case)
- ✅ Single message (startInterview case)
- ✅ Under threshold (no split, all messages returned)
- ✅ Over threshold, old bucket not full (no summarization, return all)
- ✅ Over threshold, old bucket full (create summary, return summary + recent)
- ✅ Existing summary + new batch (incremental summary with parent reference)
- ✅ Summarization failure (truncation fallback, no summary record created)
- ✅ Insight injection (placement before last message, role 'assistant')
- ✅ Token estimation accuracy
- ✅ Token logging output

### Integration Tests (conversation.service.test.ts)

Mock `contextService` and verify:
- ✅ `startInterview` calls `buildContextWindow` after persisting topic
- ✅ `sendMessage` calls `buildContextWindow` after persisting user message
- ✅ Context passed correctly to LLM
- ✅ New insights from response persisted correctly

### Manual Verification

Create conversations at key thresholds:
- 5 messages (all recent)
- 10 messages (first summary trigger)
- 15 messages (second summary trigger)
- Verify AI references details from early messages despite summarization
- Check token logs match expectations
- Verify InterviewSummary records created correctly

---

## Key Takeaways

1. **Three buckets, not two:** already_summarized → old → recent
2. **Messages flow through buckets:** recent window is fixed at 5, messages age out to old
3. **Batch summarization:** Only summarize when 5 messages accumulate in old bucket
4. **Small windows for rich content:** 5 message window optimized for long-form storytelling
5. **Incremental summaries:** Build on previous summary, don't restart from scratch
6. **Fail gracefully:** Truncate if summarization fails, retry next turn
7. **Always inject insights:** Before last message, regardless of conversation length
8. **Log everything:** Token breakdown on every turn for observability
9. **Linked list tracking:** InterviewSummary.messageCount tells us what's already compressed
