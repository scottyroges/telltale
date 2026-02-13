# ADR 006: Claude Sonnet for AI

**Status:** Accepted
**Date:** 2025-02

## Context
Need an LLM for the core conversation engine (AI interviewer), story synthesis, and insight extraction.

## Decision
Use Anthropic Claude Sonnet via the API.

## Alternatives Considered
- **GPT-4** — comparable quality, higher cost for conversational workloads
- **Claude Opus** — higher quality but significantly more expensive; not justified for the conversational use case where Sonnet performs well

## Consequences
- Best quality/cost ratio for conversational AI use case
- Estimated ~$0.05-0.15 per session for API calls
- Single provider for conversation, synthesis, and extraction
- Anthropic SDK provides streaming support for real-time chat
