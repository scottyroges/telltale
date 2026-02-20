# Codebase Explorer Memory

## Insights Feature Architecture (Plan 1.5 - Complete)

### Purpose
Insights are the AI interviewer's "mental notes" — structured observations extracted inline during each conversation turn. They capture what the AI noticed (entities, events, emotions, unexplored details) and what it wants to probe next. This creates a persistent notepad that survives across turns, summarization, and interview pauses.

### Key Design Decision (ADR 014)
**Option B: Inline Structured Output** was chosen over separate background extraction because:
- The interviewer already identifies what matters while composing its response
- Single LLM call (not two) reduces cost and latency
- Insights are useful from turn 1 (not just when summarization kicks in)
- The AI's follow-up reasoning and insight extraction stay aligned

### Architecture Flow
1. **LLM returns JSON** containing both conversational response and insights
2. **Response parser** extracts text + insights with defensive fallback (ADR 016)
3. **Conversation service** persists text as Message, insights as Insight records
4. **Insight injection** happens every turn — loaded from DB and injected as user message before conversation history
5. **tRPC endpoints** expose `getInsights(interviewId)` and `getBookInsights(bookId)`

### Schema
- Insight belongs to both `bookId` and `interviewId` (enables cross-interview context)
- Types: `ENTITY`, `EVENT`, `EMOTION`, `DETAIL`
- `explored: boolean` field exists but not actively tracked yet
- Indexed on both `bookId` and `interviewId`

### Reliability (ADR 016)
Three-layer defense against malformed LLM output:
1. **Prompt hardening** — explicit JSON format instructions with example
2. **Defensive parser** — strips markdown fences, finds JSON substring, graceful fallback
3. **Single retry** — if parse fails, sends correction prompt and re-parses once

Parser always preserves response text. Failed parse = conversation continues, insights lost for that turn only.

### Key Files
- `src/domain/insight.ts` — domain type
- `src/repositories/insight.repository.ts` — createMany, findByInterviewId, findByBookId, markExplored
- `src/services/response-parser.ts` — parseInterviewerResponse, parseWithRetry, defensive extraction
- `src/services/prompt.ts` — INTERVIEWER_SYSTEM_PROMPT with JSON format instructions
- `src/services/conversation.service.ts` — insight injection + parsing + persistence
- `src/server/routers/interview.ts` — getInsights, getBookInsights procedures

### Not Yet Implemented
- Insight UI (no frontend display/panel)
- Cross-interview insight injection (method exists, not wired)
- Active `explored` tracking (AI sees all notes, decides what to follow up)
- Insight deduplication (instructed in prompt, not enforced in code)
