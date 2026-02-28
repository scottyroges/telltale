# Plan 2b: Parallel LLM Calls (Conversation + Memory)

## Problem

The current interview flow makes a single LLM call that returns JSON containing the conversation response, updated core memory, and a completion flag. The entire response must finish generating before the user sees anything. This adds 5-10 seconds of perceived latency, which is unacceptable for a future voice mode and poor even for text.

## Insight

The memory update doesn't depend on the AI's response — it never has. Both the conversation and the memory call operate on the same input: the conversation history through the user's latest message. There's no data dependency, so they can run in parallel.

## Design

When the user sends a message, fire two LLM calls simultaneously:

1. **Conversation call** — Generates the interviewer's response. Streamed to the user token-by-token.
2. **Memory call** — Updates the core memory block. Runs in the background, writes to DB when complete.

### Conversation call

- Input: system prompt (conversation guidelines only, no memory instructions) + core memory as context + message history
- Output: plain text response (no JSON wrapper)
- Streamed to the client

### Memory call — the interviewer's internal thoughts

- Input: system prompt (memory instructions only) + current core memory + last 2-4 messages (not the full conversation)
- Output: JSON with `{ updatedCoreMemory, shouldComplete }`
- Runs in background, writes to DB on completion
- Can use a cheaper/smaller model since it's just note-taking
- Owns all analytical judgments: what to remember, what to compress, and whether the interview has reached its natural end

The memory call doesn't need the full conversation history — it *is* the memory. The core memory block carries forward everything it's decided to retain. It only needs to see what's new (the latest exchange) to decide what to update. This keeps the context window tiny and the cost low.

### Timing

The next turn's conversation call needs the updated memory. This is naturally satisfied — the user takes longer to read and type than the memory call takes to complete. If for some reason it hasn't landed yet, wait for it before sending the next turn's context.

## Benefits

- **Streaming:** User sees the response immediately, token by token
- **Lower TTFT:** Conversation call is simpler (no JSON formatting, no memory generation), so first token arrives faster
- **Voice-ready:** Sub-second TTFT enables real-time voice conversation
- **Independent tuning:** Conversation prompt and memory prompt can be optimized separately without competing for attention
- **Resilience:** Memory failure doesn't break the conversation
- **Model flexibility:** Can use different models per task (fast for conversation, cheap for memory)

## Changes Required

### Prompt split
- Extract conversation guidelines from `src/prompts/interviewer.ts` into a conversation-only prompt (plain text output, no JSON)
- Extract memory instructions into a memory-only prompt (JSON output with `updatedCoreMemory` and `shouldComplete`)

### Conversation service
- `src/services/conversation.service.ts` — Replace single `generateResponse` with two parallel calls
- Conversation call returns a stream; memory call returns a promise
- Handle the case where memory call fails (log error, preserve existing memory, don't break the conversation)

### Streaming infrastructure
- tRPC subscription or SSE endpoint for streaming the conversation response to the client
- Client-side rendering of streaming tokens in the interview UI

### Response parsing
- Conversation response is plain text — no JSON parsing needed
- Memory response is simpler JSON — just `{ updatedCoreMemory, shouldComplete }`

## Open Questions

- **Streaming transport:** tRPC subscriptions vs SSE vs something else. Need to evaluate what works best with Next.js App Router.
- **Race condition:** What if the user sends another message before the memory call completes? Need a strategy — queue, drop the stale update, or merge.
- **Completion handoff:** When the memory call sets `shouldComplete: true`, the conversation response is already streaming (or finished). Need a mechanism to signal the client that this was a closing turn — e.g. the client polls for completion status after each turn, or the memory call result pushes an event.

## Out of Scope

- Voice mode implementation (this plan enables it but doesn't build it)
- Model selection optimization (which specific models to use for each call)
- Prompt content changes (covered by plan 2a-interview-prompt-tuning)
