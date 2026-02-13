# ADR 013: Conversation Response Delivery

**Status:** Accepted
**Date:** 2026-02

## Context

The conversation engine delivers Claude's responses to the browser. The original assumption was that token-by-token streaming was critical — the "chatbot" mental model where users watch the AI type.

Telltale is not a chatbot. The AI is an **interviewer** — it asks follow-up questions, probes deeper, and draws out stories. During conversation, AI responses are short (a reflection + a follow-up question, typically 2-4 sentences). Long-form output (story construction) happens asynchronously, not in real-time.

This changes the calculus: streaming adds complexity (second API surface, custom client hook, duplicated auth) for minimal UX benefit when responses are short. A 2-3 sentence response arriving all-at-once feels snappier than watching it stream token-by-token.

## Decision

**Plain request/response through tRPC. No streaming for now.**

The conversation endpoint is a standard tRPC mutation. The service calls the Anthropic SDK, waits for the full response, and returns it. If real usage reveals noticeable lag, streaming can be added later.

### How It Works

```
Browser (tRPC mutation via React Query)
  → tRPC router validates auth, delegates to conversation service
  → Service calls Anthropic SDK, awaits full response
  → Service persists messages, returns response text
  → tRPC returns typed response to client
  → React Query updates UI
```

## Rationale

### Why Plain Request/Response

- **One API surface.** Everything goes through tRPC — full type safety, no duplicated auth.
- **Simpler client.** React Query handles loading/error states. No custom streaming hook.
- **Matches the interaction model.** Short interviewer responses don't benefit from token-by-token display.
- **Service stays framework-agnostic.** The conversation service returns a string. Easy to test, easy to extract.
- **Streaming is additive.** If lag becomes noticeable, adding a streaming endpoint later is straightforward — the service layer just needs to return an async iterable instead of a string.

### Options Considered (for later, if needed)

**ReadableStream API Route** — Dedicated `POST /api/chat` outside tRPC with a ReadableStream response. Simple, framework-native, zero dependencies. This is the likely upgrade path if streaming becomes necessary.

**Vercel AI SDK** — Fastest to implement but abstracts over core IP, couples to Vercel ecosystem, version churn risk.

**tRPC Subscriptions** — Single API surface but designed for event streams, not one-shot responses. Infrastructure complexity for uncertain benefit.

### Accepted Trade-offs

- **No progressive display.** Users see a loading state, then the full response. For short interviewer responses this is fine; for occasional longer reflections there may be a brief wait.
- **Story generation is separate.** Long-form story construction will need its own async pattern (background job + polling/notification), but that's a different problem than conversation streaming.

## Consequences

- Conversation endpoint lives in tRPC routers alongside other operations
- No custom streaming hook needed — standard React Query patterns
- Service returns a plain string (not an async iterable)
- If streaming is needed later, add a `POST /api/chat` route and `useChatStream` hook without changing the service interface significantly
- Story generation async pattern will be addressed in a future ADR
