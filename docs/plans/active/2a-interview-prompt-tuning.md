# Plan: Interview Prompt Tuning

## Context

After manual testing of the 2a core memory block, four issues were observed:

1. **Core memory too detailed** — 3000+ chars after one interview; recording too much
2. **Responses too long** — LLM repeats back what the user said; wastes tokens
3. **Doesn't follow threads** — jumps to new topics instead of circling back to unexplored threads
4. **Interview never ends naturally** — never triggered completion check even when topic felt exhausted

This PR addresses items 1-3 (all prompt tweaks in `interviewer.ts`). Items 3-4 and latency (streaming) are documented in a new enhancements plan for future work.

## Changes

### 1. `src/prompts/interviewer.ts` — Guidelines (lines 18-26)

**Response brevity** — Replace line 21:
```
- Keep your responses conversational and relatively brief — a short reflection followed by a follow-up question
```
with:
```
- Keep responses to 2-3 sentences: a brief acknowledgment and a follow-up question. Don't summarize or repeat back what they just told you — they know what they said
```

**Thread persistence** — Replace line 25:
```
- If they mention something in passing that sounds meaningful, gently circle back to it
```
with:
```
- Before introducing a new topic, check your active threads — circle back to unexplored threads from earlier in the conversation before moving on to something new
```

### 2. `src/prompts/interviewer.ts` — JSON example (line 32)

Replace placeholder ellipses with terse concrete fragments that model the target style:
```
"updatedCoreMemory": "## Book Memory\nKey people: Maria (sister, complicated). Dad (hardware store, quiet, respected).\nLife narrative: Grew up rural Ohio, oldest of three. Left for college, then Chicago.\nEmotional patterns: Quiet about mother. Lights up about Navy.\n\n## Interview Memory\nTopic: Early career\nCurrent thread: First job at Burnett\nActive threads: Dave's firing — strong reaction. 'Lost year' 1982-84.\nSession notes: Reflective today, volunteering details."
```

### 3. `src/prompts/interviewer.ts` — Core memory instructions (lines 36-58)

Replace the entire block with:

```
Core memory instructions:
You maintain a compact memory block — a compass, not a record. The conversation messages are the real record. Memory exists only to orient you: who is this person, who matters, where are we, and what to follow up on.

## Book Memory
Durable knowledge across all interviews. Use fragments, not sentences.
- Key people — Only the most important people. Name and a few words each. ("Maria (sister, complicated). Dad (hardware store, quiet).")
- Life narrative — 1-3 sentences: the big arc of their life as you understand it so far. Update, don't append.
- Emotional patterns — Durable tendencies, not today's mood. A few words each. ("Quiet about mother. Lights up about Navy.")

Be selective. If you learned it this conversation and it's still in the message history, you probably don't need it in Book Memory yet. Book Memory is for knowledge that must survive across interviews.

## Interview Memory
Session-scoped notes. Update freely.
- Topic — This interview's subject.
- Current thread — What you're exploring right now. One line.
- Active threads — 2-3 unexplored threads to follow up on. Just the thread name and why it matters.
- Session notes — One line only. Anything notable about the session flow.

Keep the total memory block between 800-1,500 characters. Start small and stay small. Even after many interviews, compress rather than grow — drop lesser people, tighten the narrative, keep only the most persistent patterns.

If you have no existing memory of this subject, create a minimal initial block from what they share. Resist the urge to record everything — capture only what you'd need to pick up the conversation tomorrow.
```

### 4. `docs/plans/active/2a-manual-test-plan.md`

Update character target references from "2,000-3,000" to "800-1,500":
- Line 65 (Scenario 2, step 2)
- Line 149 (Pass criteria item 4)

### 5. `docs/plans/active/2b-interview-experience-enhancements.md` (new)

Create an enhancements plan documenting all four observations for tracking. Items 1-3 marked as addressed by this PR. Items 4 (interview completion) and latency (streaming) documented as future work.

## What does NOT change

- File structure, function signatures, `sanitizeUserName`, name context
- Two-section memory structure (`## Book Memory` / `## Interview Memory` headers)
- All field names in memory block
- JSON response format (`{ response, updatedCoreMemory, shouldComplete }`)
- Response parser, context service, conversation service — no code changes
- `prepareMemoryForNewInterview` relies on `## Interview Memory` marker — preserved
- Closing line "Never let memory management make the conversation feel mechanical" — preserved
- `shouldComplete` instructions — unchanged

## Summary of prompt differences

| Aspect | Current | New |
|--------|---------|-----|
| Response length | "short reflection followed by a follow-up question" | "2-3 sentences... Don't repeat back what they just told you" |
| Thread follow-up | "gently circle back to it" | "check your active threads — circle back before moving on" |
| Memory framing | "persistent understanding" | "compass, not a record" |
| Character target | 2,000-3,000 | 800-1,500 |
| Compression | "As interviews accumulate" | "Start small and stay small" |
| Key people example | 85 chars per person | ~27 chars per person |
| Life narrative | 3-5 sentences | 1-3 sentences |
| Session notes | Open-ended | "One line only" |
| Selectivity | None | "don't duplicate what's in message history" |

## Verification

1. `npm run typecheck` — no type changes
2. `npx vitest run tests/prompts/interviewer.test.ts` — all existing assertions pass (verified: they check for strings preserved in the new prompt)
3. Manual test: start a new interview, send 4-5 messages, verify:
   - Core memory stays under ~1,500 characters
   - AI responses are 2-3 sentences, not parroting
   - AI circles back to earlier threads instead of always introducing new topics
