# Insights System Analysis

An honest look at what insights are, what problem they solve, and where the gaps are.

*See also: [insights-as-biographer-notes.md](./insights-as-biographer-notes.md) for aspirational vision.*

## What Insights Actually Are

Insights are the AI interviewer's **persistent notepad** — structured observations it writes to itself while conducting a conversation. They are not a user-facing feature. They are an AI-facing feature that gives the interviewer continuity across turns.

Four types, each serving a distinct purpose in the system prompt:

| Type | Purpose | Example |
|------|---------|---------|
| **ENTITY** | People, places, things — with emotional context | "sister Maria — older, bossy dynamic, user showed warmth" |
| **EVENT** | Things that happened | "1978 flood" |
| **EMOTION** | Emotional moments worth remembering | "pride and nostalgia when describing dad's hardware store" |
| **DETAIL** | Unexplored threads to probe later | "Teresa mentioned alongside Maria but no details given" |

## The Problem They Solve

The core problem is **LLM amnesia across a long conversation.** Without insights:

1. As a conversation grows, older messages get summarized to stay within the token budget. Summarization loses specifics — names, dates, emotional nuances, half-mentioned threads.
2. Even within the context window, LLMs suffer from "lost in the middle" — they pay more attention to the beginning and end, not the middle where earlier conversation details sit.
3. The interviewer has no way to remember "I should come back to Teresa later" unless it happens to be in recent messages.

Insights fix this by creating a **curated, durable memory** that:

- **Survives summarization** — loaded fresh from the DB every turn, not part of the message history that gets summarized
- **Sits in the high-attention zone** — injected just before the user's latest message (ADR 018), right where the LLM pays the most attention
- **Grows incrementally** — each turn can add new observations without losing old ones
- **Is structured** — the type system (ENTITY/EVENT/EMOTION/DETAIL) gives the AI organized categories to work with

## How the Lifecycle Works

```
User sends message
  -> context.service builds the context window
      -> loads ALL existing insights from DB
      -> injects them as an assistant message just before the user's latest message
  -> LLM sees: [messages/summary] + [insight notepad] + [user's message]
  -> LLM returns JSON: { response, insights[], shouldComplete }
  -> response-parser extracts insights (with retry on malformed JSON)
  -> NEW insights get persisted to DB
  -> response text gets sent back to user
  -> next turn, the cycle repeats with the updated notepad
```

Key design choice (ADR 014): insights are extracted **inline** from the same LLM call that generates the response. No separate background call. The interviewer is already doing the cognitive work of noticing what matters — a second call would be slower, more expensive, and disconnected from its actual reasoning.

## What's Working Well

- **Inline extraction** is smart — one LLM call does both response and note-taking
- **Defensive parsing with retry** (ADR 016) means malformed JSON doesn't crash the conversation; worst case, one turn's insights are lost
- **Placement strategy** (ADR 018) is backed by real research on LLM attention patterns
- **Cheap overhead** — just a few tokens of bulleted notes added to the context each turn

## Where It Falls Short

### 1. No Cross-Interview Memory

`findByBookId` exists but is never called during context assembly. If a user mentions their sister Maria in interview #1, the AI in interview #2 has no idea she exists. The infrastructure is there, the wiring isn't. This is the biggest gap — it undermines the "life story platform" vision where conversations should build on each other over time.

### 2. No Pruning or Growth Management

Every insight ever created gets injected every turn. A long, rich interview could accumulate hundreds of insights, eventually competing with the actual conversation for token budget. There's no summarization, deduplication, or relevance filtering for the notepad itself.

### 3. The `explored` Field is Dead Code

It exists in the schema, `markExplored` exists in the repo, but nothing ever calls it. The theory is the AI naturally decides what to revisit by re-reading its notes — but there's no mechanism to prune notes for threads that have been fully explored.

### 4. No User Visibility

The tRPC endpoints exist (`getInsights`, `getBookInsights`) but nothing in the frontend calls them. Users can't see what the AI "noticed," which means they can't verify quality, correct mistakes, or feel the value of the system.

### 5. Inconsistent Reliability Across Entry Points

`sendMessage` uses `parseWithRetry` for JSON failures, but `startInterview` and `redirect` don't — they silently drop insights on malformed JSON with no retry.

### 6. No Deduplication Enforcement

The prompt says "don't repeat insights" but there's no code-level check. The AI mostly complies, but duplicates are possible and waste tokens.

## Bottom Line

Insights solve a real, important problem — giving the AI interviewer a persistent, structured memory that survives the context window's natural decay. The architecture is sound. But right now it's a **write-heavy, read-light system**: lots of infrastructure for creating and injecting insights, very little for managing, surfacing, or cross-pollinating them.

The system keeps the AI functional across a single long conversation. It does not yet make the AI *intelligent* across an entire book's worth of interviews.
