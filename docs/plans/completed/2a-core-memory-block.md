# Plan 2a: Core Memory Block + Cross-Interview Memory

**Status:** Complete
**Created:** 2026-02-26
**Depends on:** 1.5 (insight extraction), 1.6 (context window management)
**Blocks:** 2b (onboarding), 2c (post-interview pipeline)

## Goal

Replace the current per-message insight extraction with a **core memory block** — a persistent, evolving text document that lives on the Book and represents the AI interviewer's accumulated understanding of the subject. Each interview turn, the LLM reads the current memory block and returns an updated version alongside its conversational response. The memory block persists across interviews, giving the AI cross-interview continuity.

This is the architectural pivot from "accumulate flat insights and inject all of them" to "maintain a bounded, curated working memory that the LLM manages itself" — the approach validated by MemGPT/Letta research and recommended in the insights strategy analysis.

## Why This Matters

Today, each interview is an island. The AI in interview #5 has no idea what happened in interviews #1-4. The `findByBookId()` method exists but is never called during context assembly. This is identified in the insights system analysis as "the single highest-impact gap."

The core memory block solves three problems at once:
1. **Cross-interview continuity** — the AI remembers prior sessions
2. **Bounded context** — a single bounded block replaces an unbounded list of insights (which would scale to 1,800-24,000 insights across a full book)
3. **LLM-managed compression** — the model decides what's worth remembering, not a rule-based system

## What the Core Memory Block Is

A single text field on the Book model (`coreMemory String?`), containing a structured text document with two clearly delineated sections: **Book Memory** and **Interview Memory**. The LLM updates the full block every turn. The system resets the interview section when a new interview starts.

### Structure

```
## Book Memory
Key people: Maria (older sister, close in childhood, estranged 1992-2005, reconciled after mother's death). Dad — ran a hardware store, quiet man, deeply respected. Teresa — mentioned once by Maria, relationship to subject unclear.
Life narrative: Born in rural Ohio, oldest of three. Close-knit family centered around Dad's hardware store. Left for college in Columbus, then moved to Chicago for first job in advertising. Currently has covered childhood through early career in detail.
Emotional patterns: Becomes quiet and brief when discussing mother — something unresolved there. Lights up about the Navy years. Deflects with humor when career setbacks come up. Most animated when telling stories about Dad.

## Interview Memory
Topic: Early career in Chicago (1978-1985)
Current thread: First job at the Burnett agency, relationship with mentor Dave Kowalski
Active threads: Dave's firing — strong emotional reaction, started to tell the story but pulled back. The "lost year" after leaving Burnett — subject skipped from 1982 directly to 1984.
Session notes: More reflective today than prior interviews. Volunteering details without prompting. Seems to have been thinking about this period between sessions.
```

### Book Memory Section

**Lifespan:** The entire book. Accumulates across all interviews. Never reset by the system.

**Contains:**

- **Key people** — Names and one-line relationship summaries for the most important people in the subject's story. Not everyone ever mentioned — the people who matter. Relationships should capture emotional dynamics and how they evolved over time. ("Maria: older sister, close in childhood, estranged 1992-2005, reconciled after mother's death.")
- **Life narrative** — A 3-5 sentence summary of the subject's life story as understood so far. Updated (not appended) as new information emerges. This is the interviewer's mental model of who this person is and what their life arc looks like.
- **Emotional patterns** — Durable observations about the subject's emotional tendencies across interviews. Not how they feel today — how they consistently react to certain topics. ("Becomes quiet when discussing mother. Lights up about the Navy years.")

**What the LLM does with it each turn:** Reads it, incorporates anything new from the current turn that's durable knowledge (a new person mentioned, an update to the life narrative, a newly observed emotional pattern), and returns the updated version. Most turns, the book section changes little or not at all. Occasionally a turn reveals something significant and the section gets meaningfully updated.

### Interview Memory Section

**Lifespan:** A single interview. Reset by the system at the start of each new interview.

**Contains:**

- **Topic** — What this interview session is about. Set from the interview topic at session start, may evolve as the conversation wanders.
- **Current thread** — What the conversation is actively exploring right now. A one-line orienting note.
- **Active threads** — 2-3 things that came up but weren't fully explored. The interviewer's mental "follow up on this" list. These are session-specific — they're about what to probe *in this conversation*, not across the book.
- **Session notes** — Any observations specific to this session: the subject's energy level, how this interview compares to prior ones, anything the interviewer notices about the flow of conversation.

**What the LLM does with it each turn:** Updates freely. Threads get added, explored, and removed. The current thread shifts as the conversation moves. This section is the interviewer's scratchpad for the active conversation.

### Size

**Soft guideline: ~2,000-3,000 characters total.** Communicated to the LLM in the prompt as a suggestion, not enforced by the parser. Early interviews will produce smaller blocks (less to remember). By interview #10+, the book memory section will be denser and the LLM will need to compress — dropping less important people, tightening the narrative, keeping only the most persistent emotional patterns.

No hard character limit in the parser for now. If blocks consistently grow past ~5,000 characters over many interviews, we can add enforcement later. Trust the prompt instructions first.

## Lifecycle

### First Turn of the First Interview

The memory block starts as `null` on the Book. The prompt tells the LLM there is no existing memory. The LLM creates the initial block from scratch based on whatever the subject shares in that first exchange. After the first turn, `coreMemory` is populated.

### Every Subsequent Turn (Same Interview)

1. `contextService.buildContextWindow()` reads `book.coreMemory` and injects it into the context
2. The LLM receives the current memory block as part of its context
3. The LLM returns `{ response, updatedCoreMemory, shouldComplete }`
4. `conversationService` persists the updated memory block to the Book via `bookRepository.updateCoreMemory(bookId, content)`
5. The conversational response is saved as a message

The LLM updates both sections every turn. The book section changes only when durable information is learned. The interview section changes frequently as threads open, close, and shift.

### New Interview Starts

When `conversationService.startInterview()` is called:

1. Load the Book's current `coreMemory`
2. If `coreMemory` exists, strip the interview section: find the `## Interview Memory` marker and drop everything from that point onward
3. The book memory section (everything above the marker) carries over intact
4. The LLM receives the book-only memory and a blank interview section
5. After the first turn of the new interview, the LLM populates a fresh interview section based on the new topic and initial exchange

This is a simple string operation — find the `## Interview Memory` line, keep everything before it, append a fresh `## Interview Memory` header with just the topic. No LLM call needed.

### Interview Ends Normally

Nothing special happens. The memory block on the Book already reflects everything learned — the book section was being updated every turn. The interview section contains session-specific notes that will be discarded when the next interview starts.

### Interview Abandoned (Tab Closed, Never Completed)

The book memory section is still current — it was updated every turn the subject was talking. When a new interview starts later, the interview section gets reset as usual. No data loss for durable knowledge.

This is a key advantage of the single-block approach: the book section is always up to date, regardless of whether the interview was formally completed.

### Parse Failure

If the LLM returns malformed JSON and the parser can't extract `updatedCoreMemory`:

- **The existing memory block on the Book is preserved unchanged.** No overwrite happens.
- The conversational response is still extracted (the parser falls back to raw text extraction, which already exists in `response-parser.ts`).
- One turn's memory update is lost, but all prior accumulated memory survives.
- The conversation continues normally — next turn, the LLM gets the (slightly stale) memory block and can incorporate anything it missed.

## Response Format

The LLM response format changes from:

```json
{
  "response": "Your conversational reply to the storyteller...",
  "insights": [
    { "type": "ENTITY", "content": "sister Maria — older, bossy dynamic" }
  ],
  "shouldComplete": false
}
```

to:

```json
{
  "response": "Your conversational reply to the storyteller...",
  "updatedCoreMemory": "## Book Memory\nKey people: ...\nLife narrative: ...\nEmotional patterns: ...\n\n## Interview Memory\nTopic: ...\nCurrent thread: ...\nActive threads: ...\nSession notes: ...",
  "shouldComplete": false
}
```

The `insights` array is removed. `updatedCoreMemory` is a single string containing the full updated memory block (both sections). The LLM returns the complete block every turn — not a diff, not an append instruction, the whole thing.

### Max Output Tokens

The current `DEFAULT_MAX_TOKENS = 1024` in `anthropic-provider.ts` is too tight. The LLM now returns a conversational response (~300-800 tokens) plus the full memory block (~500-750 tokens). Increase to `2048` to accommodate both comfortably.

### Parse Correction Prompt

The existing `PARSE_CORRECTION_PROMPT` in `response-parser.ts` needs updating to reflect the new JSON shape. Instead of asking for `insights`, it asks for `updatedCoreMemory`.

## Context Injection

### Current Behavior

`contextService.buildContextWindow()` loads insights via `insightRepository.findByInterviewId()` and injects them as an assistant message before the final user message:

```
[Previous interview notes]
- ENTITY: sister Maria — older, bossy dynamic
- EMOTION: pride and nostalgia when describing dad's hardware store
```

### New Behavior

`contextService.buildContextWindow()` receives the `coreMemory` string from the caller and injects it as an assistant message before the final user message:

```
[Your memory — what you know about this subject]
## Book Memory
Key people: Maria (older sister, close in childhood, estranged 1992-2005, reconciled after mother's death)...
Life narrative: Born in rural Ohio, oldest of three...
Emotional patterns: Becomes quiet when discussing mother...

## Interview Memory
Topic: Early career in Chicago
Current thread: First job at Burnett, mentor Dave Kowalski
Active threads: Dave's firing, the "lost year" 1982-1984
Session notes: More reflective today, volunteering details
```

### Token Accounting

The memory block replaces insights in the token budget. The `calculateTokenBreakdown()` function currently tracks `insights` tokens. This becomes `coreMemory` tokens. The numbers are similar — an insight list for a 30-turn interview might be ~500-1000 tokens; the memory block will be ~500-750 tokens. Net token impact is roughly neutral.

The `buildInsightContextMessage()` function is replaced with a `buildCoreMemoryContextMessage()` function that wraps the raw memory block text with a header the LLM recognizes.

## Data Flow (After)

```
User sends message
  |
conversationService.sendMessage(interviewId, bookId, content, userName)
  |
messageRepository.create(USER message)
  |
contextService.buildContextWindow(interviewId, userName, coreMemory)
  +-- Load messages (existing)
  +-- Use coreMemory param (NEW — replaces insight loading)
  +-- Load existing summaries (existing)
  +-- Assemble: systemPrompt + messages-with-memory-injected
  |
llmProvider.generateResponse()  [maxTokens: 2048]
  +-- Returns JSON: { response, updatedCoreMemory, shouldComplete }
  |
responseParser.parseInterviewerResponse()
  +-- Extracts and validates JSON
  +-- Returns { text, updatedCoreMemory, shouldComplete, parsed }
  |
messageRepository.create(ASSISTANT message)
bookRepository.updateCoreMemory(bookId, updatedCoreMemory)  [NEW — replaces insightRepository.createMany()]
  |
(If shouldComplete) interviewRepository.complete(interviewId)
```

Key changes from current flow:
- `contextService` uses `coreMemory` param instead of `insightRepository.findByInterviewId()`
- `contextService` signature changes to `(interviewId, userName, coreMemory: string | null)` — callers load and pass the memory
- Response parser extracts `updatedCoreMemory` string instead of `insights[]`
- `bookRepository.updateCoreMemory()` replaces `insightRepository.createMany()`
- `llmProvider` uses `maxTokens: 2048` instead of `1024`

## Relationship to Existing Insights System

The core memory block **replaces insights for the interviewer's working memory** (Job 1 from insights-strategy.md). The existing insight extraction infrastructure is not deleted but becomes dormant — it will be repurposed in Phase 2c for the post-interview processing pipeline (Job 2: cross-interview indexing, Job 3: book creation index).

Specifically:
- The `Insight` model, repository, and domain types remain in the codebase
- The system prompt stops requesting insights in the JSON response format
- Context injection switches from insight list to core memory block
- `insightRepository.createMany()` calls are removed from the conversation service
- The `getInsights` and `getBookInsights` tRPC endpoints remain (they still return historical data)

## Phases

This plan is split into 4 phases, each delivered as its own PR:

### Phase 1: Schema + Repository Layer
Add `coreMemory` field to the Book model, create migration, update repository and domain types. Pure data layer — no behavior changes.

- Add `coreMemory String?` to Book model in `prisma/schema.prisma`
- Run `npx prisma migrate dev` to create migration
- Run `npx prisma generate` to regenerate `src/db/types.ts` via prisma-kysely
- Add `coreMemory: string | null` to `Book` domain type in `src/domain/book.ts`
- Add `updateCoreMemory(bookId: string, content: string): Promise<Book>` to `bookRepository`
- Include `coreMemory` in the `columns` array in `bookRepository` so it's returned by all queries
- Update test fixtures that construct `Book` objects to include `coreMemory: null`:
  - `tests/repositories/book.repository.test.ts`
  - `tests/server/routers/book.test.ts` (`ownBook` constant)
  - `src/components/books/book-list.test.tsx` (`makeBook()` helper)
- Write tests for the new repository method

### Phase 2: System Prompt + Response Format
Rewrite the interviewer system prompt to request a core memory block instead of insights. Update the response parser to handle the new JSON shape. Update `maxTokens` in the LLM provider.

- Rewrite `src/prompts/interviewer.ts` to:
  - Remove insight extraction instructions
  - Add core memory block instructions (both sections, what each contains, size guideline, the two-section structure)
  - Add guidance on the book vs. interview memory distinction
  - Update the example JSON to show `updatedCoreMemory` instead of `insights[]`
- Update `src/services/response-parser.ts`:
  - Add `updatedCoreMemory: string | null` to `ParsedResponse` type
  - Keep `insights: ParsedInsight[]` on `ParsedResponse` as a deprecated field (always `[]`) — removed in Phase 4 after `conversationService` stops reading it
  - `parseInterviewerResponse()` extracts `updatedCoreMemory` string; sets `insights` to `[]`
  - `PARSE_CORRECTION_PROMPT` reflects the new JSON shape
  - When parse fails, `updatedCoreMemory` is `null` (signals "don't overwrite")
- Update `DEFAULT_MAX_TOKENS` from `1024` to `2048` in `src/lib/anthropic-provider.ts`
- Update all response parser tests

### Phase 3: Context Assembly + Conversation Service Integration
Wire the memory block into the live conversation loop end-to-end.

- Update `contextService.buildContextWindow()`:
  - Accept `coreMemory: string | null` parameter — callers pass the memory string directly (signature becomes `(interviewId, userName, coreMemory)`). This lets `startInterview` pass stripped memory while `sendMessage`/`redirect` pass the raw book value.
  - Replace `buildInsightContextMessage()` with `buildCoreMemoryContextMessage()`
  - Replace `assembleMessagesWithInsights()` with `assembleMessagesWithCoreMemory()`
  - Update token breakdown to track `coreMemory` instead of `insights`
- Update `conversationService`:
  - Add `bookRepository` import (new dependency — needed to load `coreMemory` and call `updateCoreMemory()`)
  - `startInterview()`: load book's core memory via `bookRepository.findById(bookId)`, strip interview section (keep everything before `## Interview Memory`, append fresh `## Interview Memory` header with topic). This stripping happens in `conversationService` — it owns the lifecycle decision of when a new interview resets session memory. Pass the stripped memory to context service. After LLM response, persist `updatedCoreMemory` to book. Remove `insightRepository.createMany()`.
  - `sendMessage()`: load book's core memory via `bookRepository.findById(bookId)`, pass `coreMemory` to context service. After LLM response, persist `updatedCoreMemory` to book (only if parsed — `null` means don't overwrite). Remove `insightRepository.createMany()`.
  - `redirect()`: same pattern as `sendMessage()` — persist memory, remove insights.
- Update context service tests
- Update conversation service tests

### Phase 4: Cleanup + Cross-Interview Verification
Remove dormant code paths, verify cross-interview continuity, handle edge cases.

- Remove insight-related code from context assembly (the `buildInsightContextMessage` function, insight loading in `buildContextWindow`)
- Remove `insightRepository` import from `conversationService`
- Remove deprecated `insights` field from `ParsedResponse` type and any remaining `ParsedInsight` references
- Verify: interview #2 on the same book picks up book memory from interview #1
- Verify: interview #2 gets a clean interview memory section
- Verify: first interview on a new book (no existing memory) works correctly
- Verify: parse failure preserves existing memory block
- Verify: abandoned interview #1 + new interview #2 has correct book memory
- Run full test suite, typecheck, lint

## Key Files Affected

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `coreMemory String?` to Book model |
| `src/db/types.ts` | Regenerated by prisma-kysely |
| `src/domain/book.ts` | Add `coreMemory` to domain type |
| `src/repositories/book.repository.ts` | Add `updateCoreMemory()` method, include `coreMemory` in columns |
| `src/prompts/interviewer.ts` | Rewrite for core memory block format with two sections |
| `src/services/response-parser.ts` | Handle `updatedCoreMemory` instead of `insights[]` |
| `src/services/context.service.ts` | Inject core memory block instead of insights, accept `coreMemory` param |
| `src/services/conversation.service.ts` | Add `bookRepository` import, persist updated memory block, strip interview section on new interview, remove insight persistence |
| `src/lib/anthropic-provider.ts` | Increase default max tokens to 2048 |
| `tests/services/response-parser.test.ts` | Updated for new JSON shape |
| `tests/services/context.service.test.ts` | Updated for memory block injection |
| `tests/services/conversation.service.test.ts` | Updated for memory block persistence + interview section reset |

## Design Decisions

### One block with two sections, not two separate fields
We considered separate book-level and interview-level memory fields. The problem: either the LLM updates two separate fields per turn (messy response format, more parsing), or we defer book memory updates to interview end (stale if interview abandoned). A single block with two labeled sections gives the LLM one thing to update while making the lifespan distinction explicit. The system only needs to do one simple operation: strip the interview section when a new interview starts.

### Memory block lives on Book, not Interview
The whole point is cross-interview continuity. The Book is the right entity — it represents "everything we know about this subject." The interview section is ephemeral within the block, but the block itself lives on the Book.

### LLM overwrites the full block each turn
Not append-only. The LLM is responsible for compression, prioritization, and deciding what to keep or drop. This keeps the block bounded and avoids the scaling problem of accumulating insights.

### Interview section reset is a string operation, not an LLM call
When a new interview starts, the system finds the `## Interview Memory` marker and replaces everything after it with a fresh header containing the topic. No LLM call needed — this is deterministic string manipulation. The LLM populates the new interview section from its first response.

### Insight extraction becomes dormant, not deleted
Phase 2c (post-interview pipeline) will need structured entity/relationship extraction — a different flavor of the same capability. Keeping the infrastructure makes the 2c build faster. The insight code stays in the codebase but is no longer called during the conversation loop.

### Parse failure preserves existing memory
If the LLM returns malformed JSON and the parser can't extract `updatedCoreMemory`, the existing memory block on the Book is preserved unchanged. The conversation continues normally — one turn's memory update is lost, but the accumulated memory from all prior turns survives.

### Max output tokens increases to 2048
The LLM now returns both a conversational response (~300-800 tokens) AND an updated memory block (~500-750 tokens). The current 1024 max output tokens is too tight. 2048 gives comfortable headroom for both.

## Open Questions

1. **Memory block format enforcement:** The two-section structure uses markdown headers (`## Book Memory`, `## Interview Memory`). Should the parser validate that both sections exist in the returned block? Leaning toward no — if the LLM returns a well-formed block without the exact headers, we still store it. The prompt is clear enough about the structure.

2. **Existing insights data:** Books that already have insights from earlier interviews will still have those records in the DB. They won't be injected into new interviews. We won't seed core memory from existing insights — existing books are dev/test data. Start fresh.

3. **First interview special handling:** Should the prompt for the very first turn (null core memory) be meaningfully different from subsequent turns? Or is "You have no existing memory of this subject" sufficient? Leaning toward simple null handling — the prompt already explains what to do when there's no memory.

## Follow-ups (Resolved)

- **~~Add `parseWithRetry` to `startInterview` and `redirect`~~:** Done in PR #53. Both methods now use `parseWithRetry` for consistency with `sendMessage`.
- **~~Pin core memory in `enforceMaxTokens`~~:** Done in PR #52. Core memory message is now reserved before the backwards walk so it survives aggressive truncation.

## Done When

- A `coreMemory` text field exists on the Book model and can be read/written
- The AI interviewer returns `{ response, updatedCoreMemory, shouldComplete }` JSON
- The memory block has two sections: Book Memory (durable) and Interview Memory (session)
- The core memory block is injected into the context window every turn
- After each turn, the updated memory block is persisted to the Book
- When a new interview starts, the interview section is reset while the book section carries over
- Interview #2 on the same book picks up book-level context from interview #1 via the memory block
- Parse failures preserve the existing memory block (no data loss)
- Abandoned interviews don't leave the book memory in a bad state
- Existing insight code is dormant but not deleted
- All tests pass, build succeeds, lint passes, typecheck passes
