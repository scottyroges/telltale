# Plan 2a: Parallel LLM Calls (Conversation + Memory)

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

- Input: system prompt (memory instructions only) + current core memory + messages since last memory update (typically 2: previous assistant response + new user message)
- Output: JSON with `{ updatedCoreMemory, shouldComplete }`
- Runs in background, writes to DB on completion
- Can use a cheaper/smaller model since it's just note-taking
- Owns all analytical judgments: what to remember, what to compress, and whether the interview has reached its natural end

The memory call doesn't need the full conversation history — it *is* the memory. The core memory block carries forward everything it's decided to retain. It only needs to see what's new since the last update — typically the previous assistant response and the new user message. In edge cases (rapid messages, failed updates), it includes all messages since the last successful memory write. This keeps the context window tiny and the cost low.

Note: The memory call does not see the current turn's AI response — only prior messages. This is by design. The calls run in parallel, so the AI's response doesn't exist yet when the memory call fires. The memory call's job is to react to what the user said, not to what the AI said back.

### Timing

The next turn's conversation call reads whatever memory is committed in the DB. The user typically takes longer to read and type than the memory call takes to complete, so memory is fresh. If the memory call hasn't landed yet, the conversation uses the previous turn's memory — one turn stale at worst. The adaptive message window on the memory call ("since last successful write") means it will catch up on the next turn.

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
- `src/services/conversation.service.ts` — Fires the conversation call (streaming) and the memory call (via `memoryService`) in parallel in all three methods: `sendMessage`, `startInterview`, and `redirect`
- Conversation call returns a stream
- Assistant message persisted to DB after the stream completes (collect full text during streaming, save once done)

### Memory service (new)
- `src/services/memory.service.ts` — Owns the memory call end-to-end: context assembly (core memory + messages since last update), LLM call, JSON parsing, DB write
- Context assembly is simple — no summarization or token counting, just concatenate core memory + recent messages
- Handles its own errors — if the call or parse fails, log and preserve existing memory
- Called by `conversationService`, independently testable

### Streaming infrastructure
- Switch tRPC client from `httpBatchLink` to `httpBatchStreamLink` — enables streaming responses over existing HTTP transport
- Model the conversation call as a tRPC generator procedure that `yield`s string chunks during execution and `return`s `{ shouldComplete }` after awaiting the memory call at the end
- Client iterates chunks for rendering, reads the return value for completion state
- Client-side rendering of streaming tokens in the interview UI

### Response parsing
- Conversation response is plain text — no JSON parsing needed
- Memory response is simpler JSON — just `{ updatedCoreMemory, shouldComplete }`
- No retry mechanism for memory call — if JSON parsing fails, log the error, preserve existing memory, and move on. The next turn's memory call will naturally pick up the unprocessed messages since it includes all messages since the last successful memory write

## Open Questions

- ~~**Streaming transport:**~~ **Resolved:** tRPC v11 `httpBatchStreamLink` with generator procedures. No new transport needed — just swap the link and yield chunks from the procedure.
- ~~**Race condition:**~~ **Resolved:** No waiting. The conversation call reads whatever memory is in the DB. If the previous memory call hasn't landed, the conversation uses stale memory for one turn. The memory call's adaptive window (messages since last successful write) catches up naturally.
- ~~**Completion handoff:**~~ **Resolved:** The tRPC generator procedure `yield`s chunks during streaming, then awaits the memory call and `return`s `{ shouldComplete }`. The client gets completion state as the procedure's return value after the stream ends.

## PR Split

**PR 1: Prompt split.** Extract the single interviewer prompt into two: a conversation-only prompt (plain text output) and a memory-only prompt (JSON with `{ updatedCoreMemory, shouldComplete }`). No behavior change — the conversation service still makes a single call. Delivers independently testable prompts. **Complete.**

**PR 2: `LLMProvider` streaming interface.** Add a `generateStreamingResponse` method to `LLMProvider` and implement it in `AnthropicProvider`. Pure infrastructure — no callers change yet. **Complete.**

**PR 3: Memory service + parallel calls.** Create `memoryService`. Change `conversationService` to fire conversation and memory calls in parallel. Conversation call still uses non-streaming `generateResponse` for now. Delivers the latency improvement from parallelism and the resilience benefit without touching any client code. **Complete.** Memory service is self-contained (`src/services/memory.service.ts`): fetches recent messages, calls LLM with memory prompt, parses JSON, writes to DB. Wrapped in try/catch so failures never propagate. Conversation responses are plain text (no JSON wrapper, no `parseWithRetry`). `startInterview` skips memory call (no meaningful context at interview start).

**PR 4: Streaming transport + client rendering.** Switch to `httpBatchStreamLink`, convert tRPC procedures to generators that yield chunks, update the interview UI to render tokens incrementally. End-to-end streaming.

## Out of Scope

- Voice mode implementation (this plan enables it but doesn't build it)
- Model selection optimization (which specific models to use for each call)
- Prompt content changes (covered by plan 2a-interview-prompt-tuning)
