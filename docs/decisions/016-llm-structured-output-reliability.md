# ADR 016: LLM Structured Output Reliability Strategy

**Status:** Accepted
**Date:** 2026-02

## Context

Plan 1.5 (ADR 014) chose inline structured output: the interviewer LLM returns a JSON object containing both the conversational response and extracted insights. This requires the response to be parseable as JSON on every turn. If parsing fails, insights are lost and the app must recover gracefully.

LLMs occasionally deviate from format instructions — adding prose before the JSON, wrapping it in markdown fences, or returning plain text when confused. The question is: how do we defend against this without coupling to a specific LLM provider's proprietary features?

## Rejected: Tool Use / Function Calling

Anthropic's tool use API (and OpenAI's structured outputs) enforce schema-valid JSON at the API level. The model is constrained to respond with a valid payload matching a declared schema — no parsing needed.

**Why rejected:** We want to preserve the ability to swap models freely — try a new model on release, A/B test providers, or move off a provider if pricing changes. Tool use is implemented differently across providers (Anthropic tool_use, OpenAI function_calling, no standard for open-weight models). Building on it couples the LLM provider interface to a specific protocol that not all models support equally.

**Revisit if:** Response reliability becomes unacceptable even with defensive parsing + retry, AND the decision is made to commit to a single provider long-term.

## Decision: Defensive Parsing + Single Retry

Three-layer defense, all provider-agnostic:

### Layer 1: Prompt Hardening (preventive)
- Format instructions go at the end of the system prompt (models attend more to recency)
- Include a concrete example of the exact JSON structure
- Explicit: "Respond with only the JSON object, no other text or formatting"

### Layer 2: Defensive Parser (recovery)
The parser attempts extraction in order, stopping at the first match:
1. **Fence stripping** — find a markdown code fence anywhere in the string (not just full-string fences), extract its contents
2. **JSON substring extraction** — find the first `{...}` block in the string (handles "Here's my response: {...}")
3. **Full-string parse** — try to parse the string as-is
4. **Graceful fallback** — return raw text with empty insights, set `parsed: false`

At each step, the response text is always preserved. A parse failure never silences the user's interviewer response.

### Layer 3: Single Retry (correction)
If `parsed: false`, the conversation service sends a correction message back to the LLM: "Your response wasn't valid JSON. Please respond with only this structure: ..." and re-parses. One retry only — two failures in a row are returned as graceful fallback rather than shown as an error.

## Consequences

- **Model-agnostic** — works with any text-completion model regardless of tool-use support
- **Degradation is graceful** — failed parse returns the response text; insights are lost for that turn but the conversation continues
- **One retry adds latency** — rare, but a parse failure adds one LLM round-trip before the user sees a response
- **No guaranteed schema** — unlike tool use, we can't guarantee the structure at the API level; malicious or confused responses could still slip through after retry (handled by graceful fallback)
