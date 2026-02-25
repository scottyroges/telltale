# Context Window Management

**Status:** Complete (Plan 1.6 done)
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
   (compressed in summary)    (waiting for 3000 tokens)   (last 2000 tokens)
```

### The Three Buckets

**1. Recent (verbatim)**
- Messages that fit within 2000 tokens, kept word-for-word
- Dynamic window size based on token budget (not message count)
- Always includes at least the most recent message (even if it exceeds budget)
- High fidelity for immediate context

**2. Old (accumulating)**
- Messages that aged out of recent
- Accumulate until reaching 3000 tokens
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
When old bucket reaches 3000 tokens
   ↓
Summarize those messages
   ↓
Move to already_summarized (via InterviewSummary record)
   ↓
Reset old bucket to empty
```

## Key Thresholds

### Constants

```typescript
MAX_CONTEXT_TOKENS = 16000             // Hard limit (enforced by truncation)
SUMMARIZATION_THRESHOLD = 8000         // Trigger point for starting summarization
RECENT_WINDOW_TOKENS = 2000            // Token budget for recent messages (dynamic count)
OLD_BUCKET_TOKENS = 3000               // Token threshold to trigger summarization of old messages
```

**Hard Limit Enforcement:**
After context assembly (whether under threshold, incremental, or summarized), `enforceMaxTokens()` performs a final check. If the total exceeds `MAX_CONTEXT_TOKENS`, it truncates to keep only the most recent messages that fit, working backwards from the end. This is a safety net that should rarely trigger given the conservative `SUMMARIZATION_THRESHOLD` (8K), but prevents context overflow if:
- Token estimation is significantly off
- Individual messages are unexpectedly large
- Summary text grows larger than expected

### Why These Numbers?

**RECENT_WINDOW_TOKENS = 2000**
- Optimized for long-form storytelling with variable message lengths
- Provides consistent token budget regardless of whether messages are short or verbose
- ~5 typical messages fit within 2000 tokens (at ~400 tokens each)
- Short messages allow more in recent window; long messages mean fewer
- Always includes at least the most recent message for continuity

**OLD_BUCKET_TOKENS = 3000**
- Summarize when old bucket accumulates sufficient content
- 1.5x the recent window size ensures meaningful summaries (not just 1-2 messages)
- Typically 3-8 messages depending on message length (at ~400 tokens/message, ~7-8 messages)

**SUMMARIZATION_THRESHOLD = 8000 tokens**
- When total context exceeds this, we start the sliding window strategy
- Conservative threshold (half of max) to leave room for responses

### Trigger Logic

```typescript
// Walk backward from latest message, accumulating tokens for recent window
const recent: Message[] = [];
let recentTokens = 0;

for (let i = allMessages.length - 1; i >= alreadySummarizedCount; i--) {
  const msg = allMessages[i];
  const msgTokens = estimateTokens(msg.content);

  // Always include at least the most recent message
  if (recent.length > 0 && recentTokens + msgTokens > RECENT_WINDOW_TOKENS) {
    break;
  }

  recent.unshift(msg);
  recentTokens += msgTokens;
}

// Old messages = everything between already summarized and recent window
const recentStartIndex = allMessages.length - recent.length;
const oldMessages = allMessages.slice(alreadySummarizedCount, recentStartIndex);

// Calculate old bucket token count
const oldTokens = oldMessages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);

// Should we summarize?
if (oldTokens >= OLD_BUCKET_TOKENS) {
  // Yes - create new summary covering oldMessages
  // New messageCount = alreadySummarizedCount + oldMessages.length
}
```

## Token-Based Windowing

**Why tokens instead of message count?**

In long-form storytelling, message length varies dramatically:
- A short confirmation: "Yes, that's exactly right" (~5 tokens)
- A rich narrative: Multi-paragraph story about childhood (~800 tokens)

Using a fixed message count (e.g., "last 5 messages") creates two problems:

**Problem 1: Underutilizing the budget**
- If the last 5 messages are short (~100 tokens each = 500 total)
- We could have included 10-15 messages within our 2000 token budget
- Context is unnecessarily truncated

**Problem 2: Exceeding the budget**
- If the last 5 messages are verbose (~600 tokens each = 3000 total)
- We blow past our intended window size
- Summarization triggers later than expected

**Token-based approach benefits:**
- **Consistent budget:** Recent window always uses ~2000 tokens, never more, rarely much less
- **Adaptive to content:** Short messages → more messages included; long messages → fewer included
- **Better summarization triggers:** Old bucket summarizes at 3000 tokens, ensuring consistent batches regardless of message count
- **Whole messages only:** Never splits a message mid-content — if a message doesn't fit, exclude it entirely
- **Minimum guarantee:** Always includes at least the most recent message, even if it exceeds 2000 tokens (maintains continuity)
- **Symmetric approach:** Both recent window (2000 tokens) and old bucket threshold (3000 tokens) use token-based logic

**Example scenarios:**

```typescript
// Scenario A: Short messages (100 tokens each)
recent = last 20 messages (2000 tokens total)  // Adaptive!

// Scenario B: Typical messages (400 tokens each)
recent = last 5 messages (2000 tokens total)   // Expected case

// Scenario C: Long messages (800 tokens each)
recent = last 2 messages (1600 tokens total)   // Still within budget

// Scenario D: One giant message (3000 tokens)
recent = last 1 message (3000 tokens)          // Exceeds budget, but guaranteed
```

The system walks backward from the most recent message, accumulating tokens until the budget is exhausted. This ensures recent context adapts to the actual content, not a fixed count.

---

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

**Scenario:** Conversation has 5 typical-length messages (~400 tokens each)

**State:**
- Total messages: 5
- Total tokens: ~3,000 (under 8K threshold)
- Recent window: all 5 messages fit within 2000 token budget
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

### Example 4: Not Yet Ready to Summarize (10 Messages)

**Scenario:** Conversation reaches 10 messages (typical length ~400 tokens each)

**State:**
- Total messages: 10
- Total tokens: ~11,000
- Recent window: walk backward, ~5 messages fit within 2000 tokens
- Buckets: recent=[6,7,8,9,10], old=[1,2,3,4,5], already_summarized=none

**Behavior:**
- Split into buckets
- recent = last ~5 messages within token budget [6-10]
- old = [1-5]
- Calculate: oldTokens = ~2000 tokens (5 messages × ~400 tokens)
- Check: `oldTokens = 2000 < 3000` → **don't summarize yet**
- Use existing summary (none), send all messages verbatim
- Returns: `{ systemPrompt, messages: [1,2,3,4,5,6,7,8,9,10 with insights] }`

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
ASSISTANT: (message 8)
USER: (message 9)

ASSISTANT: [Previous interview notes]
- ENTITY: Teresa (sister) — played under oak tree
- DETAIL: Hardware store mentioned but not explored

USER: (message 10)
```

**Note:** With typical 400-token messages, you'd need ~7-8 messages in old bucket to hit 3000 tokens. This example would need 3 more messages before triggering summarization.

---

### Example 5: First Summary Triggered (13 Messages)

**Scenario:** Conversation at 13 messages (~400 tokens each)

**State:**
- Total messages: 13
- Buckets: recent=[9,10,11,12,13], old=[1,2,3,4,5,6,7,8], already_summarized=none

**Behavior:**
- Split into buckets
- recent = last ~5 messages within 2000 token budget [9-13]
- old = messages 1-8 (before recent window)
- Calculate: oldTokens = ~3200 tokens (8 messages × ~400 tokens)
- Check: `oldTokens = 3200 >= 3000` → **SUMMARIZE!**
- Summarize messages 1-8 into prose
- Create InterviewSummary with `messageCount: 8`
- After summarization: recent=[9-13], old=[], already_summarized=summary(1-8, count=8)
- Returns: `{ systemPrompt, messages: [summary, 9,10,11,12,13 with insights] }`

**What gets sent to LLM:**
```
SYSTEM: You are a skilled life story interviewer...

ASSISTANT: To recap our earlier conversation: You grew up on Elm Street
in Ohio in the 1960s. You described your house with the big oak tree in
the front yard where you and your sister Teresa would play. You mentioned
your father ran the hardware store on Main Street, and how you'd visit
after school...

USER: (message 9)
ASSISTANT: (message 10)
USER: (message 11)
ASSISTANT: (message 12)

ASSISTANT: [Previous interview notes]
- ENTITY: Teresa (sister) — played under oak tree
- DETAIL: Hardware store mentioned but not explored

USER: (message 13)
```

**Database:**
```
InterviewSummary {
  id: "sum_1"
  interviewId: "int_123"
  parentSummaryId: null      // First summary
  content: "You grew up on Elm Street in Ohio..."
  messageCount: 8            // Covers messages 1-8
}
```

---

### Example 6: Second Summary (21 Messages)

**Scenario:** Conversation reaches 21 messages (~400 tokens each)

**State:**
- Total messages: 21
- Buckets: recent=[17,18,19,20,21], old=[9,10,11,12,13,14,15,16], already_summarized=summary(1-8, count=8)

**Behavior:**
- Split into buckets
- recent = last ~5 messages within 2000 token budget [17-21]
- old = messages 9-16 (between already summarized and recent)
- Calculate: oldTokens = ~3200 tokens (8 messages × ~400 tokens)
- Check: `oldTokens = 3200 >= 3000` → **SUMMARIZE!**
- Summarize messages 9-16, incorporating previous summary
- Create InterviewSummary with `messageCount: 16`, links to previous
- After summarization: recent=[17-21], old=[], already_summarized=summary(1-16, count=16)
- Returns: `{ systemPrompt, messages: [new summary, 17,18,19,20,21 with insights] }`

**What gets sent to LLM:**
```
SYSTEM: You are a skilled life story interviewer...

ASSISTANT: To recap our earlier conversation: [Updated summary incorporating
messages 1-16. Includes the Ohio childhood, the hardware store stories,
your first day of school where you met Jimmy, and the summer you spent
learning to ride a bike...]

USER: (message 17)
ASSISTANT: (message 18)
USER: (message 19)
ASSISTANT: (message 20)

ASSISTANT: [Previous interview notes]
- ENTITY: Jimmy (childhood best friend) — met on first day of school
- EVENT: Learning to ride a bike that summer

USER: (message 21)
```

**Database:**
```
InterviewSummary {
  id: "sum_2"
  interviewId: "int_123"
  parentSummaryId: "sum_1"   // Links to first summary
  content: "Updated summary..."
  messageCount: 16           // Covers messages 1-16
}

// sum_1 still exists (linked list pattern)
InterviewSummary {
  id: "sum_1"
  parentSummaryId: null
  messageCount: 8
}
```

---

### Example 7: Summarization Failure Fallback (21 Messages)

**Scenario:** At 21 messages, summary should trigger but LLM fails

**State:**
- Total messages: 21
- Buckets: recent=[17-21], old=[9-16], already_summarized=summary(1-8)
- LLM summarization call fails (network error, timeout, etc.)

**Behavior:**
- Split into buckets normally
- Calculate: oldTokens = ~3200 tokens (8 messages × ~400 tokens)
- Check: `oldTokens = 3200 >= 3000` → attempt summarization
- Summarization **FAILS**
- **Fallback:** Token-based truncation
  - Walk backward with 2x recent window budget (4000 tokens)
  - Accumulate messages that fit within budget
  - Typically ~10 messages (if 400 tokens each)
  - Always include at least the most recent message
- **Do NOT create InterviewSummary** (next turn will retry)
- Returns: `{ systemPrompt, messages: [existing summary(1-8), 12,13,14,15,16,17,18,19,20,21 with insights] }`

**What gets sent to LLM:**
```
SYSTEM: You are a skilled life story interviewer...

ASSISTANT: To recap our earlier conversation: [summary of messages 1-8]

USER: (message 12)
ASSISTANT: (message 13)
USER: (message 14)
ASSISTANT: (message 15)
USER: (message 16)
ASSISTANT: (message 17)
USER: (message 18)
ASSISTANT: (message 19)
USER: (message 20)

ASSISTANT: [Previous interview notes]
- ...

USER: (message 21)
```

**Database:**
- No new InterviewSummary created
- Still only has sum_1 (messages 1-8)
- Next turn at 22 messages:
  - old = messages 9-17 (9 messages × 400 = ~3600 tokens)
  - Will retry summarization (oldTokens >= 3000)

---

### Example 8: Continuing the Pattern (29 Messages)

**Scenario:** Conversation continues to 29 messages (~400 tokens each)

**State:**
- Total messages: 29
- Buckets: recent=[25-29], old=[17-24], already_summarized=summary(1-16, count=16)

**Behavior:**
- Split into buckets
- recent = last ~5 messages within 2000 token budget [25-29]
- old = messages 17-24 (between already summarized and recent)
- Calculate: oldTokens = ~3200 tokens (8 messages × ~400 tokens)
- Check: `oldTokens = 3200 >= 3000` → SUMMARIZE messages 17-24
- Create InterviewSummary with messageCount: 24, links to previous
- After: recent=[25-29], old=[], already_summarized=summary(1-24, count=24)

**Pattern established (at 400 tokens/message):**
- Every ~8 messages (3200 tokens), we create a new summary
- Messages 1-8 → summarized at message 13
- Messages 9-16 → summarized at message 21
- Messages 17-24 → summarized at message 29
- Messages 25-32 → will be summarized at message 37
- And so on...
- **Note:** Frequency varies with message length — short messages summarize less often, long messages more often

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
- System prompt (~500 tokens base, slightly more when personalized with user's name)
- Summary (if exists, ~200-500 tokens)
- All messages in context (~varies by content)
- All insights (~20-50 tokens each)

**Logging:**
Every turn logs both token breakdown and message buckets:
```typescript
console.log('[Context] Message buckets:', {
  recent: { count: 5, tokens: 2012 },
  old: { count: 3, tokens: 1204 },
  alreadySummarized: 5
});

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
- Acceptable: Token logging helps detect summary drift; moderate batch size (3000 tokens, ~7-8 messages) balances frequency with meaningful summaries

---

## Flow Diagrams

### buildContextWindow Decision Tree

```
buildContextWindow(interviewId, userName)
  │
  ├─ Load interview → null? → throw Error("Interview not found")
  ├─ Build personalized system prompt (includes user's name if provided)
  ├─ Load messages (all messages including hidden, filter USER/ASSISTANT roles only)
  ├─ Load insights
  ├─ Load latest summary (if exists)
  │
  ├─ Estimate tokens (system + summary + messages + insights)
  ├─ Log token breakdown via console.log
  │
  ├─ Total < SUMMARIZATION_THRESHOLD (8000)?
  │   YES → Assemble all messages with insights
  │         Apply enforceMaxTokens()
  │         Return
  │   NO  → Continue ↓
  │
  ├─ Split into three buckets:
  │   - recent = walk backward from latest, accumulate messages within 2000 token budget
  │   - already_summarized = existingSummary?.messageCount ?? 0
  │   - old = messages between already_summarized and recent
  │
  ├─ Check: oldTokens >= OLD_BUCKET_TOKENS (3000)?
  │   NO  → Use existing summary (if any), assemble all old + recent messages
  │         Apply enforceMaxTokens()
  │         Return
  │   YES → Continue ↓
  │
  ├─ Call LLM to summarize old messages
  │   SUCCESS → Create InterviewSummary (messageCount = already + old.length)
  │             Assemble summary + recent messages
  │             Apply enforceMaxTokens()
  │             Return
  │   FAIL    → Token-based fallback truncation (2x recent window budget = 4000 tokens)
  │             Walk backward, accumulate messages within fallback budget
  │             Assemble truncated messages (no summary record)
  │             Apply enforceMaxTokens()
  │             Return
  │
  └─ Return { systemPrompt, messages }
```

### Message Flow (Detailed)

**Assumption:** Typical messages are ~400 tokens each, so ~5 fit in 2000 token budget.

```
Messages 1-5: (under threshold)
  recent=[1,2,3,4,5] (all fit in 2000 tokens), old=[], summarized=none
  Action: None (under threshold)

Message 6 arrives: (over threshold, start bucketing)
  Walk backward from msg 6, accumulate tokens:
    msg 6 (400 tok) → recent=[6]
    msg 5 (400 tok) → recent=[5,6]
    msg 4 (400 tok) → recent=[4,5,6]
    msg 3 (400 tok) → recent=[3,4,5,6]
    msg 2 (400 tok) → recent=[2,3,4,5,6] (2000 tokens total, stop)
  recent=[2-6] (2000 tokens), old=[1] (400 tokens), summarized=none
  Action: None (oldTokens = 400 < 3000)

Messages 7-10 arrive:
  Walk backward from msg 10, accumulate ~5 messages in 2000 tokens
  recent=[6-10], old=[1,2,3,4,5] (2000 tokens), summarized=none
  Action: None (oldTokens = 2000 < 3000)

Messages 11-12 arrive:
  Walk backward from msg 12, accumulate ~5 messages in 2000 tokens
  recent=[8-12], old=[1,2,3,4,5,6,7] (2800 tokens), summarized=none
  Action: None (oldTokens = 2800 < 3000)

Message 13 arrives:
  Walk backward from msg 13, accumulate ~5 messages in 2000 tokens
  recent=[9-13], old=[1,2,3,4,5,6,7,8] (3200 tokens), summarized=none
  Action: SUMMARIZE! (oldTokens = 3200 >= 3000)
  Result: recent=[9-13], old=[], summarized=sum_1(1-8, count=8)

Messages 14-20 arrive:
  Walk backward from msg 20, accumulate ~5 messages in 2000 tokens
  recent=[16-20], old=[9,10,11,12,13,14,15] (2800 tokens), summarized=sum_1(count=8)
  Action: None (oldTokens = 2800 < 3000)

Message 21 arrives:
  Walk backward from msg 21, accumulate ~5 messages in 2000 tokens
  recent=[17-21], old=[9,10,11,12,13,14,15,16] (3200 tokens), summarized=sum_1(count=8)
  Action: SUMMARIZE! (oldTokens = 3200 >= 3000)
  Result: recent=[17-21], old=[], summarized=sum_2(1-16, count=16)

Pattern continues every ~8 messages at 400 tokens/message (3200 tokens in old bucket)...
```

**Note:** If message lengths vary significantly, the number of messages in the recent window will vary accordingly. Token budget (2000) is fixed, message count is adaptive.

---

## Edge Cases

### Empty Interview
- 0 messages
- Returns empty array
- Defensive handling (shouldn't happen in practice)

### Exactly at Window Size (Typical Messages)
- 5 messages total (~400 tokens each = 2000 tokens)
- All 5 fit in recent window budget
- recent=[1-5], old=[], summarized=none
- No summarization (nothing in old bucket)

### Just Over Window Size
- 6 messages total (~400 tokens each)
- Walk backward: last 5 messages fit in 2000 token budget
- recent=[2-6], old=[1], summarized=none
- No summarization (old bucket not full)

### Variable Message Lengths
- 3 long messages (800 tokens each)
- Walk backward: last 2 messages = 1600 tokens (fits), 3rd message would exceed
- recent=[2-3], old=[1], summarized=none
- Recent window adapts to content length

### Exactly at First Summary Trigger
- 13 messages (typical ~400 tokens each)
- recent=[9-13], old=[1-8], summarized=none
- oldTokens = 3200 >= 3000 → Create first summary

### Token Counts Exactly Equal to Thresholds
- When oldTokens exactly equals 3000 → Summarize (>= trigger)
- When recent exactly equals 2000 tokens → Normal operation

### LLM Timeout During Summarization
- Summarization fails
- Fall back to token-based truncation (2x recent window budget = 4000 tokens)
- Walk backward, accumulate messages within 4000 token budget
- Typically ~10 messages (if 400 tokens each)
- Conversation continues without interruption
- Next turn will retry (old bucket will have more tokens)

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
- If summaries are too lossy: Increase RECENT_WINDOW_TOKENS or OLD_BUCKET_TOKENS (larger batches = more context per summary)
- If context is too expensive: Decrease RECENT_WINDOW_TOKENS or decrease OLD_BUCKET_TOKENS (summarize more frequently)
- If messages are consistently longer/shorter than expected: Adjust RECENT_WINDOW_TOKENS accordingly
- Token breakdown logging and message bucket logging inform these decisions

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
- ✅ Token logging output (including message bucket counts and token totals)
- ✅ Hard token limit enforcement (truncates to most recent messages when over MAX_CONTEXT_TOKENS)
- ✅ Token-based recent window (dynamic message count based on content length)
- ✅ Token-based fallback (accumulates messages within 2x token budget when summarization fails)

### Integration Tests (conversation.service.test.ts)

Mock `contextService` and verify:
- ✅ `startInterview` calls `buildContextWindow` after persisting topic
- ✅ `sendMessage` calls `buildContextWindow` after persisting user message
- ✅ Context passed correctly to LLM
- ✅ New insights from response persisted correctly

### Manual Verification

Create conversations at key thresholds:
- Varied message lengths (short vs. long narratives)
- 5 typical messages (all recent, ~2000 tokens)
- 10 typical messages (first summary trigger)
- 15 typical messages (second summary trigger)
- Verify AI references details from early messages despite summarization
- Check token logs match expectations (message bucket counts + token totals)
- Verify recent window adapts to message length (more short messages, fewer long messages)
- Verify InterviewSummary records created correctly

---

## Key Takeaways

1. **Three buckets, not two:** already_summarized → old → recent
2. **Token-based windowing:** Both recent window (2000 tokens) and old bucket threshold (3000 tokens) use token-based budgets — adapts to message length
3. **Messages flow through buckets:** Recent window is dynamic (based on tokens), messages age out to old
4. **Batch summarization:** Only summarize when old bucket reaches 3000 tokens (~7-8 typical messages)
5. **Adaptive to content:** Token-based approach handles variable message lengths gracefully throughout the entire pipeline
6. **Incremental summaries:** Build on previous summary, don't restart from scratch
7. **Fail gracefully:** Token-based truncation fallback if summarization fails, retry next turn
8. **Always inject insights:** Before last message, regardless of conversation length
9. **Log everything:** Token breakdown and message bucket counts (with token totals) on every turn for observability
10. **Linked list tracking:** InterviewSummary.messageCount tells us what's already compressed
