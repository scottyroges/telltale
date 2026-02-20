# ADR 018: Insight Context Placement

**Status:** Accepted
**Date:** 2026-02-19
**Deciders:** Engineering
**Tags:** `insights`, `llm`, `prompt-engineering`

## Context

Insights are the AI interviewer's running notepad — structured observations about entities, events, emotions, and unexplored details. These insights are injected into the LLM context on every turn so the AI can maintain continuity and circle back to important threads.

The question: **where in the context should insights be placed?**

### The "Lost in the Middle" Problem

Research on LLM context windows shows that models pay most attention to:
1. **The very beginning** of the context (first few messages)
2. **The very end** of the context (most recent exchanges)

And **least attention** to the middle of the context.

In a long conversation (20+ turns), insights placed at the very beginning drift toward the middle as the conversation grows. A 40-message conversation with insights at position 1 means those insights are now ~39 positions away from where the AI is generating its response.

### When Do Insights Matter Most?

Insights matter most when the AI is **deciding what to ask next** — which happens at the end of the context, right after the user's most recent message. Having the insights fresh in "working memory" at decision time makes them more salient and actionable.

## Decision

**Place insights right before the most recent user-assistant exchange** instead of at the very beginning of the context.

### Context Order (New)

```
SYSTEM: You are a skilled life story interviewer...

USER: The topic for this conversation is: childhood memories...
ASSISTANT: I'd love to hear about your childhood! Where did you grow up?
USER: We lived on Elm Street in Ohio. My dad ran the hardware store...
ASSISTANT: Tell me more about your dad's hardware store. What was it like?

USER: [Previous interview notes]
- ENTITY: dad — ran hardware store on Main, everyone knew him
- DETAIL: Teresa mentioned but no details — worth exploring
- EMOTION: pride when describing dad's hardware store

USER: Oh, it was the heart of the community...
```

### Context Order (Previous)

```
SYSTEM: You are a skilled life story interviewer...

USER: [Previous interview notes]
- ENTITY: dad — ran hardware store on Main, everyone knew him
- DETAIL: Teresa mentioned but no details — worth exploring
- EMOTION: pride when describing dad's hardware store

USER: The topic for this conversation is: childhood memories...
ASSISTANT: I'd love to hear about your childhood! Where did you grow up?
USER: We lived on Elm Street in Ohio. My dad ran the hardware store...
ASSISTANT: Tell me more about your dad's hardware store. What was it like?
USER: Oh, it was the heart of the community...
```

## Rationale

**Keeps insights in the high-attention zone:**
- As conversations grow longer, insights stay near the end where LLM attention is highest
- Avoids the "lost in the middle" problem

**Semantically clearer:**
- Mimics how a human interviewer would work: review the conversation, then review your notes, then respond
- The insights are "fresh" right before generating the next question

**Better for decision-making:**
- The AI's job is to decide what to ask next based on: (1) what the user just said, (2) what the AI's notes say to follow up on
- Having both pieces of information near each other in context makes the connection more salient

## Consequences

**Positive:**
- Insights remain salient even in long conversations (30+ messages)
- More natural semantic flow: "review notes → respond"
- Better utilization of the context window's attention bias

**Negative:**
- Breaks strict chronological ordering (insights appear "mid-conversation")
- Slightly less common pattern than "RAG context at top" (but this isn't pure RAG)

**Neutral:**
- Easy to change if future experiments show a different placement works better
- No impact on storage, parsing, or API — this is purely a prompt engineering change

## Alternatives Considered

### 1. Keep Insights at the Beginning (Status Quo)
- **Pro:** Clean separation of "context" vs. "conversation"
- **Pro:** Common RAG pattern (retrieved context → conversation)
- **Con:** Vulnerable to "lost in the middle" as conversation grows
- **Verdict:** Rejected due to attention decay in long conversations

### 2. Place Insights at Both Beginning and End
- **Pro:** Maximum visibility — insights in both high-attention zones
- **Pro:** Redundancy ensures insights are never lost
- **Con:** Wastes tokens (~100-200 tokens duplicated)
- **Con:** May confuse the model with duplicate information
- **Verdict:** Rejected as overkill; consider if end-only proves insufficient

### 3. Inject Insights into System Prompt
- **Pro:** System prompts get very high attention
- **Pro:** Insights would be "ever-present" without consuming message tokens
- **Con:** System prompts are static — can't update with new insights mid-conversation
- **Con:** Would require regenerating system prompt on every turn (breaks caching)
- **Verdict:** Rejected; insights must be dynamic

### 4. Split Old vs. Recent Insights
- **Pro:** Old insights at beginning (for context), recent insights (last 3-5 turns) at end (for action)
- **Pro:** Balances historical context with fresh decision-making
- **Con:** Adds complexity (tracking "recent" threshold, splitting logic)
- **Con:** Risk of duplicate insights if same insight is both old and recent
- **Verdict:** Deferred; consider if conversations regularly exceed 50+ messages

## Implementation

Single change in `conversationService.sendMessage()`:
- Load full message history
- Slice off the last user message
- Inject insights as a user message
- Append the last user message

No database, API, or parsing changes required.

## Future Considerations

- **Measure impact:** Compare follow-up question quality in short (5-10 turn) vs. long (20+ turn) conversations
- **A/B test placement:** Could experiment with different placements for different conversation lengths
- **Insight summarization:** If insights grow to 50+ entries, may need to summarize or prune older insights
- **Cross-interview insights:** When wiring book-level insights, consider placing them even earlier (before interview-specific insights)

## References

- ADR 014: Insight Extraction Strategy (inline vs. separate)
- ADR 016: LLM Structured Output Reliability (parsing strategy)
- "Lost in the Middle" research on LLM context window attention patterns
