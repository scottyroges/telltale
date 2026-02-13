# ADR 014: Insight Extraction Strategy

**Status:** Tentative (Option B — pending prototype validation)
**Date:** 2026-02

## Context

Plan 1.5 describes extracting structured insights (people, places, events, emotions, unexplored details) from interview conversations. These insights appear in three places in the current plans:

1. **Within an interview** — injected into context when summarization kicks in (Plan 1.6), helping the AI remember specifics lost during summarization
2. **Across interviews** — `getBookInsights(bookId)` enables cross-interview awareness within a book
3. **Future UI** — sidebar or panel showing extracted insights (not yet planned)

The open question: **what role do insights play in driving the interview, and how should they be produced?**

The current Plan 1.5 treats insights as passive metadata — extracted via a separate background LLM call, stored, and injected into context only when the conversation gets long enough to need summarization. This means insights do nothing for short conversations and are disconnected from the interviewer's actual reasoning about what to ask next.

An alternative: insights are the interviewer's own "mental notes" — produced inline as part of each response, representing what the AI noticed and wants to explore later. This makes them an active interview tool, not just a memory aid.

## Options

### Option A: Separate Background Extraction (Current Plan 1.5)

After each assistant response, fire a separate LLM call to extract insights. The extraction runs asynchronously and doesn't block the response.

**How it works:**
- Interviewer responds normally (text only)
- A second LLM call analyzes recent messages and outputs structured insights
- Insights are stored and later injected into context when summarization triggers

**Pros:**
- Clean separation — interviewer prompt stays focused on interviewing
- Can use a cheaper/faster model for extraction
- Extraction prompt can be tuned independently without affecting conversation quality
- If extraction fails, the conversation is completely unaffected
- Straightforward to test (two independent services)

**Cons:**
- Two "minds" analyzing the same conversation — the extractor may miss nuance the interviewer caught
- Extra LLM call per turn (cost, even if using a cheaper model)
- Timing gap — insights from turn N might not be persisted when turn N+1 arrives
- Insights are disconnected from the AI's reasoning. The interviewer decides to follow up on Maria, but the extractor doesn't know that. The interviewer skips Teresa, but the extractor doesn't know why.
- The `explored` flag has no natural owner — nothing marks an insight as explored when the AI follows up on it
- Insights only affect the interview when context window management kicks in (~20+ messages). For short conversations, they're extracted but never used.

### Option B: Inline Structured Output

The interviewer LLM returns both its conversational response and insights in a single call. Insights are the AI's own notes about what it noticed and wants to explore.

**How it works:**
- The interviewer prompt includes instructions to output structured JSON containing both the response text and any insights
- The service parses the response, persists the text as a message and the insights as Insight records
- Insights are available immediately for the next turn

**Pros:**
- Single LLM call — insights come from the same "mind" conducting the interview
- No timing gap — insights are persisted before the next user message arrives
- The AI's follow-up reasoning and insight extraction are naturally aligned. When it decides "I want to ask about Maria next," it can also note "Teresa was mentioned but not explored" as a future probe.
- Lower cost per turn (one call instead of two)
- The `explored` problem becomes tractable — the AI can note which insights it's actively following up on
- Insights are useful from turn 1, not just when summarization kicks in

**Cons:**
- More complex interviewer prompt (conversation + extraction instructions in one)
- Structured output parsing adds a failure mode — if JSON parsing fails, must recover the response text gracefully
- Can't use a cheaper model for extraction (same call)
- Complicates the current `generateResponse() => string` LLM provider interface
- Prompt tuning affects both conversation quality and extraction quality simultaneously

### Option C: Hybrid — Inline Notes + Periodic Deep Extraction

The interviewer outputs lightweight "notes to self" inline (what to explore next), while a separate periodic call does richer categorization and cross-referencing.

**How it works:**
- Interviewer response includes brief notes: "explore Teresa", "circle back to hardware store"
- Periodically (every N turns, or on interview completion), a separate call does deeper extraction with structured typing (ENTITY, EVENT, EMOTION, DETAIL)
- Deep extraction powers cross-interview context and book-level features

**Pros:** Lightweight inline keeps the prompt focused; rich extraction happens less frequently. **Cons:** Most complex architecture, two insight pipelines, probably over-engineering for MVP.

## Interview Walkthrough

### Scenario 1: Early Interview — First Few Exchanges

**User:** "Tell me about where you grew up."
**AI:** "I'd love to hear about that! What was your neighborhood like as a kid?"

**User:** "We lived on Elm Street in a small Ohio town. My dad ran the hardware store on Main — everyone knew him. Mom taught third grade at Lincoln Elementary. I have two sisters, Maria and Teresa. Maria's older, she was always bossing me around."

The AI processes this and decides to follow up on Maria — the user gave the most energy there ("always bossing me around" has warmth and specificity).

**With Option A:** The AI responds based on the full message history. It naturally follows up on Maria. Meanwhile, a separate call extracts: Maria (sister, older, bossy), Teresa (sister, barely mentioned), dad (hardware store), mom (teacher), Ohio, Elm Street. These insights sit in the database unused — the conversation is short, context window management hasn't kicked in, and the interviewer doesn't know about the insight list.

**With Option B:** The AI responds AND outputs its notes: "Noticed: dad's hardware store sounds like a community hub. Teresa mentioned but user gave no details — worth exploring later. Maria's bossy dynamic had energy — following up now." These notes become insights immediately. On the next turn, the context includes: "You previously noted you want to explore Teresa and the hardware store." The AI has a running list of its own observations.

**Key difference:** In Option A, the AI forgets its own reasoning between turns — it just sees messages. In Option B, the AI builds a persistent notepad of what it noticed and what it wants to explore.

### Scenario 2: Long Interview — 25+ Messages, Summarization Active

The conversation has gone deep on Maria, the neighborhood, and school. Early messages are now summarized: "Grew up in small Ohio town. Father ran hardware store on Main Street. Mother taught at Lincoln Elementary. Two sisters: Maria (older) and Teresa."

The summary preserves facts but loses nuance — the warmth in the user's voice about Maria, the conspicuous lack of detail about Teresa, the "everyone knew him" community detail about dad.

**With Option A:** Insights extracted earlier (if they survived the timing gap) are now injected: "Topics mentioned but not explored: Teresa — mentioned as sister but no details." This helps, but the framing is generic — the AI doesn't know *why* Teresa is worth exploring or what the conversational moment was.

**With Option B:** The AI's own earlier notes are injected: "You noted: Teresa mentioned but user gave no details — worth exploring later. Dad's hardware store described as community institution — everyone knew him." The AI has its own reasoning preserved, not just bare facts.

### Scenario 3: Cross-Interview Context

**Interview 1 (childhood):** User mentions "Uncle Roberto used to take me fishing every summer at the lake. Those were the best weeks of my year."

**Interview 2 (career):** User says "I studied marine biology in college."

**With Option A:** Book-level insights include: "Uncle Roberto — fishing, summer, lake." When injected into Interview 2's context, the AI could connect fishing to marine biology. But the emotional weight ("best weeks of my year") may not have been captured in the extraction.

**With Option B:** The insight from Interview 1 reads: "Uncle Roberto — fishing every summer at the lake. User described these as the best weeks of their year — strong emotional connection to water/nature." The AI in Interview 2 can make a richer connection: "You mentioned Uncle Roberto and those summers at the lake being the best weeks of your year. Is that connection to water part of what drew you to marine biology?"

### Scenario 4: Re-engagement After a Pause

User pauses an interview halfway through, comes back 2 weeks later.

**With Option A:** The AI has the summary + whatever insights were extracted. It picks up generically: "Last time we were talking about your childhood in Ohio."

**With Option B:** The AI has its own notes: "User started to mention something about a Christmas Eve at the hardware store but we got sidetracked into school memories. Want to circle back." It can say: "Welcome back! Last time you started to tell me about a Christmas Eve at your dad's hardware store — I'd love to hear that story."

## Trade-offs Summary

| Dimension | Option A (Separate) | Option B (Inline) |
|-----------|-------------------|------------------|
| Cost per turn | Higher (2 LLM calls) | Lower (1 call) |
| Insight quality | Generic extraction | Interviewer's own reasoning |
| Useful from turn 1? | No (only after summarization) | Yes |
| `explored` tracking | Hard (no natural owner) | Natural (AI tracks its own follow-ups) |
| Prompt complexity | Simple interviewer prompt | More complex (interview + notes) |
| Failure isolation | Extraction failure is invisible | Must handle JSON parse failure gracefully |
| Model flexibility | Can use cheaper model for extraction | Same model for both |
| Cross-interview | Facts only | Facts + reasoning + emotional context |
| Testability | Two simple services | One service with structured output parsing |

## Open Questions

1. **LLM provider interface** — Option B requires the provider to return structured data, not just a string. How does this affect the `LLMProvider` abstraction? Options: JSON response parsing in the service layer, tool-use/function-calling in the provider, or a new `generateStructuredResponse` method.

2. **Prompt complexity** — Does adding extraction instructions to the interviewer prompt degrade conversation quality? Needs testing. The risk is that the AI focuses too much on "noting insights" and not enough on being a warm, natural interviewer.

3. **What insight types do we actually need?** The current types (ENTITY, EVENT, EMOTION, DETAIL) are extraction-oriented categories. If insights are the AI's interview notes, maybe the types are different — "explore later", "follow up", "emotional moment", "connection to previous topic."

4. **How are insights injected into context?** Even with Option B, once summarization kicks in, how do we present the AI's accumulated notes? As a simple list? Grouped by topic? Pruned to only unexplored items?

5. **Should the AI be allowed to "forget" insights?** If the AI notes 30 things to explore but the interview only lasts 15 more turns, should old/stale insights be pruned or deprioritized?

## Tentative Decision

**Option B: Inline Structured Output** — with a prototype-first approach.

### Why Option B

**The interviewer is already doing the work.** When the AI decides to follow up on Maria instead of Teresa, it has already identified Maria as the more interesting thread. Option A throws that reasoning away and pays a second LLM call to rediscover it. Option B just asks the AI to write down what it's already thinking.

**Cost is real.** Two LLM calls per turn doubles API spend on the core interaction loop. For a product where users might do hundreds of turns across a book's worth of interviews, that adds up fast. The second call doesn't produce better insights — it produces *worse* ones because it lacks the interviewer's reasoning about why something matters.

**"Useful from turn 1" is the deciding factor.** If insights only kick in at message 20+, they aren't driving the interview — they're a fallback for context window limits. That's useful, but it's not the vision. Insights should be the thing that makes the interviewer *good* — noticing what to probe, when to circle back, what the user skipped over. That needs to work from the first exchange.

**The main risk is testable.** Prompt complexity degrading conversation quality is a real concern, but asking an LLM to "respond naturally AND note what you want to explore later" is a natural instruction — it's what a good interviewer does without thinking. And if it doesn't work, we fall back to Option A with minimal code changes (see Architectural Guardrails below).

### Prototype First

Before building any infrastructure, test the prompt. Write the Option B interviewer prompt — "respond in JSON with your response text and your interview notes" — and run sample conversations through the Anthropic API or console. Answer two questions:

1. **Does conversation quality hold up?** Does the AI still feel like a warm, curious interviewer when it's also taking notes?
2. **Are the notes useful?** Do the insights capture the right things — emotional nuance, unexplored threads, connections — or are they just restating what the user said?

If the answer to both is yes, build the infrastructure. If conversation quality suffers, try refining the prompt. If it fundamentally doesn't work, fall back to Option A — the consumption side (reading insights, injecting into context) is identical either way.

### Architectural Guardrails

Two principles keep the door open for changing approaches:

**1. The LLMProvider stays dumb.** It returns `{ content: string }` regardless of approach. For Option B, that string happens to be JSON. A parsing layer in the conversation service handles the split. If we switch to Option A, the provider returns plain text and we add a separate extraction call. The provider never knows about insights.

**2. Decouple insight production from consumption.** The consumption side — reading insights from the DB, injecting them into context, tracking explored/unexplored — is identical no matter how insights are produced. Plan 1.6 doesn't change. The only things that change between approaches are:
- What the system prompt says (include extraction instructions or not)
- How the LLM response is parsed (JSON split vs. plain text)
- Where insights come from (parsed from response vs. separate call)

That's a small, localized surface area. No strategy patterns or abstractions needed — just a different code path in the conversation service.
