# Biography Reverse Chain

> Working backward from a finished biography to the raw interviews, mapping exactly what each stage produces and what it consumes. The goal: reveal the data supply chain so we know what to capture and when.

## The Chain

```
Onboarding + Interview Planning → Initial Core Memory Block,
                                  Interview Plan (living document)
    ↓
Interview → Transcript + Updated Core Memory Block
    ↓                                        ↑
Post-Interview Processing → Segment Index,   │ (feedback loop:
    Entity Extractions, Knowledge Graph      │  new threads, gaps,
    Updates, Interview Summary,              │  coverage needs feed
    New Threads, Contradictions ─────────────┘  next interview plan)
    ↓
Corpus-Level Analysis → Entity/Relationship Graph, Timeline, Theme Map,
                        Coverage Map, Emotional Peaks, Contradictions,
                        Subject's Self-Identified Pivots
    ↓
Macro Structure → Editorial Thesis, Chapter Plan, Structural Choices
    ↓
Chapter Dossiers → Organized Source Material Per Chapter,
                   Relevant Quotes, Supporting Facts, Emotional Notes
    ↓
Rough Draft → Complete Manuscript (unpolished)
    ↓
Finished Biography
```

## Stage 7: The Finished Biography

**What it is:** A polished, published-quality life story. Reads like a book you'd buy. Has the subject's voice, a compelling narrative arc, thematic coherence, emotional resonance. Chapters flow naturally. The reader feels like they know this person.

**What makes it "finished" vs. what came before:**
- Prose is polished — sentence-level craft, transitions, pacing
- Voice is consistent and authentic — sounds like the subject, not an AI
- Structural choices are finalized — chapter order, what's included, what's cut
- Framing/editorial perspective is clear — the book knows what it's *about* (not just what happened)
- Continuity is airtight — no contradictions, no loose threads (unless intentional)

**Consumes:**
- The rough draft
- The subject's actual speech patterns/voice samples (to calibrate authenticity)
- A clear editorial thesis ("this book is about resilience" or "this book is about reinvention")

### Timing, Implementation, and Process

**When:** After all chapter rough drafts are reviewed and the user is broadly happy with the content. Iterative — the user reads the full manuscript, notes issues, the system addresses them. This might also be partially manual — the user (or a human editor) does some polishing themselves. The system assists but doesn't own this stage.

**Implementation:** A "Polish" mode in the manuscript editor. The system runs automated checks and offers targeted improvements, but the user drives. Think editing assistant, not ghostwriter.

Automated passes:
- **Voice consistency check**: Compare the voice profile against each chapter. Flag passages where the narrator sounds different.
- **Continuity check**: Scan for contradictions across chapters — names, dates, facts that don't match.
- **Transition smoothing**: Identify chapter boundaries and section breaks that feel abrupt. Propose transition language.
- **Pacing analysis**: Flag sections significantly longer/shorter than their narrative importance warrants.

**Process:**

1. **Full-manuscript consistency pass** (2-3 LLM calls) — Feed the LLM the full manuscript (or chapter-by-chapter with cross-references). Identify voice inconsistencies, factual contradictions, pacing problems, weak transitions, sections that feel AI-generated rather than authentic. If the manuscript exceeds one context window, process in overlapping windows (chapters 1-3, then 2-4, then 3-5) to catch cross-chapter issues.

2. **User-directed revisions** (1 LLM call per revision) — The user works through the issue list, accepting some, dismissing others, requesting specific changes.

3. **Final voice calibration** (1 LLM call per chapter) — A final pass focused on voice. Does each chapter sound like the subject? Compare against the voice profile and raw transcripts.

4. **Export** (code, no LLM) — Generate the final output: formatted document (PDF, EPUB, print-ready). Front matter, chapter titles, dedication. Template/formatting step, not creative.

**LLM cost: ~5-15 calls** depending on manuscript length and revision count.

## Stage 6: The Rough Draft

**What it is:** A complete manuscript, beginning to end. All chapters exist. The story is told. But it's rough — some sections are overwritten, some underwritten. Voice may be inconsistent across chapters (especially if they were written at different times or from different source material). Transitions between chapters may be clunky. Some passages may feel more like summarized research than lived experience.

**What's different from the finished version:**
- Uneven quality — some chapters sing, others feel flat
- Pacing problems — some sections drag, others rush through important moments
- Voice drift — the "narrator" sounds different in different sections
- May include material that ultimately should be cut (but it's all there to evaluate)
- Structural order may still need adjustment

**Consumes:**
- Chapter outlines with organized source material per chapter
- The editorial thesis
- The subject's voice (enough raw transcript access to write *in* their voice, not just *about* them)

### Timing, Implementation, and Process

**When:** Per-chapter, after the user reviews and approves the chapter dossier. Could batch all chapters, but per-chapter is better — the user can review and adjust before committing to the whole book. This is a **loop within each chapter** — draft, review, feedback, redraft sections.

**Implementation:** Each chapter draft is an async job taking the chapter dossier as input. The output is stored as rich text or markdown. The drafting UI shows the manuscript alongside the source material — the user can see which interview segments a paragraph was built from, verify quotes, check that narrative matches their memory. Traceability is important for trust.

**Process:**

1. **Build the voice profile** (1 LLM call, once per book) — Before any drafting, analyze the subject's speech patterns across all transcripts. Vocabulary, sentence style, humor, verbal tics, distinctive phrases. Produce a "voice guide" with examples. Generated once, used for every chapter.

2. **Draft the chapter** (1-3 LLM calls per chapter) — Feed the LLM: chapter description, organized dossier (quotes, segments, entity context, emotional notes), voice guide, editorial thesis. Short chapters may be one call; longer ones done in sections (opening, middle, closing), each getting prior sections as context. The prompt instructs the LLM to:
   - Write in/near the subject's voice (guided by the voice profile)
   - Build narrative around actual quotes (don't paraphrase when the subject said it better)
   - Follow the emotional arc suggested by the dossier
   - Maintain the editorial thesis as an undercurrent
   - Flag places where it's inventing connective tissue vs. working from source material

3. **Source attribution** (code, no LLM) — Link paragraphs back to source segments. Could be done during drafting (LLM cites segment IDs as it writes) or as post-processing (match quotes/facts to transcript segments). The user should be able to click any passage and see where it came from.

4. **User review and revision loop** (1 LLM call per revision) — User reads and gives feedback: "This section feels rushed," "The quote is wrong — I said blue, not red," "More about what I was feeling." Each request triggers a targeted redraft of the affected section.

**LLM cost: ~2-5 calls per chapter initial draft, +1 per revision.** For a 10-chapter book with ~2 revisions per chapter, ~40-70 calls total. The most LLM-intensive stage but also the most valuable.

## Stage 5: Chapter Outlines + Organized Source Material

**What it is:** The biographer's "ur-document" — Stacy Schiff's 100-page dossier per chapter, Caro's chapter notebooks. Each chapter has:
- A description of what this chapter covers and why it matters to the overall arc
- The key scenes/moments/events that belong here
- The relevant quotes from interviews (with enough surrounding context to use them well)
- Supporting facts, dates, names
- Notes on emotional tone and what this chapter should make the reader feel
- Gaps or thin spots where the source material doesn't fully support the chapter's goals

**What's different from a rough draft:** No prose yet. This is organized research, not narrative. It's a filing system, not a manuscript.

**Consumes:**
- The macro structure (chapter plan + editorial thesis)
- A corpus-level index — a way to find all the moments where Maria is mentioned, or all the stories from the 1970s, or all the times the subject talked about fear
- Thematic analysis — what are the recurring themes? Where do they appear?
- Relationship map — who matters, how they relate, how relationships evolved
- Raw transcripts (for pulling actual quotes and voice)

### Timing, Implementation, and Process

**When:** After the macro structure is locked. Generated as a batch for all chapters so the user can review the full picture before any prose gets written. This might **loop back** — if a dossier reveals a chapter is too thin ("Chapter 4 on the Chicago years only has material from one interview and 3 segments"), the user might do another interview before proceeding.

**Implementation:** An async batch job takes the Book Structure and produces a ChapterDossier record per chapter. Each dossier contains: chapter description (from structure), relevant transcript segments (queried from the segment index by era/entities/themes), key quotes (specific excerpts strong enough for direct use), entity/relationship context (the knowledge graph slice for this chapter), emotional notes (which segments had high intensity), and gaps/weaknesses. The user reviews dossiers in a UI that lets them rearrange, add/remove segments, flag quotes, and annotate.

**Process:**

1. **Map chapters to source material** (code + 1 LLM call per chapter) — For each chapter, query the knowledge graph and segment index for matching content. Chapter metadata says "covers childhood in rural Ohio, themes of family and independence, key people: Mom, Maria, Grandpa Joe." Query for segments where era matches, entities match, themes match, events fall in the relevant time period. This produces a raw candidate set. An LLM call curates: given this chapter's goals and this candidate material, which segments are most relevant? What order? What's missing?

2. **Extract key quotes** (1 LLM call per chapter) — From the relevant transcript segments, identify the 10-20 strongest direct quotes — moments where the subject's voice is most vivid, emotional, or revealing. These become what the rough draft builds around. The biographer doesn't write the story then find quotes — they find the great quotes and build narrative around them.

3. **Assess chapter readiness** (1 LLM call per chapter, or algorithmic) — Per chapter, produce a readiness assessment: "Strong — rich material from 4 interviews, multiple emotional peaks, good coverage" vs. "Thin — only 2 brief mentions, no direct quotes, consider another interview focused on this period."

**LLM cost: ~2-3 calls per chapter, so 16-30 for an 8-10 chapter book.** Runs as a batch, async.

## Stage 4: The Macro Structure (Book Architecture)

**What it is:** The architectural plan for the book. Not just a list of chapters — a thesis-driven structure that makes an argument about what this life story is *about*.

Examples of structural choices:
- Chronological (childhood → present)
- Thematic (chapters organized by life domains: family, career, identity)
- Pivotal moments (structured around 5-7 turning points)
- Hybrid (chronological backbone with thematic digressions)

This stage also includes the **editorial thesis**: "This is a story about someone who kept reinventing themselves" or "This is a story about the tension between duty and desire." The thesis determines what gets emphasized, what gets cut, and how events are framed.

**What's different from chapter outlines:** This is the skeleton without the flesh. It says "Chapter 3 covers the move to Chicago and what it meant" but doesn't yet contain the organized source material for that chapter.

**Consumes:**
- A high-level summary of the entire life story — the full arc, the major periods, the key people, the big events
- Theme identification — what patterns recur across the interviews?
- Turning point identification — what moments changed the trajectory?
- Coverage assessment — what parts of the life are richly covered vs. thin?
- The subject's own sense of their story — what do *they* think their life is about? What moments do *they* identify as pivotal?

### Timing, Implementation, and Process

**When:** User-initiated, iterative. The user decides they're ready to think about structure — maybe after 10-15 interviews, or after corpus analysis reveals sufficient material. This is a **collaborative loop** — system proposes, user refines, system adjusts. 3-5 iterations typical. The user might go back and do more interviews after seeing structural gaps.

**Implementation:** A dedicated UI flow — "Plan Your Book" or similar. Different interaction mode than interviewing — editorial, back-and-forth about organization rather than storytelling. The output is a Book Structure record: editorial thesis (a paragraph), ordered chapter list (each with title, description, themes/eras/entities it covers), and structural notes (why this order, what was cut).

**Process:**

1. **Generate initial proposals** (1-2 LLM calls) — Feed the LLM the corpus-level synthesis: theme map, timeline, arc, pivots, coverage assessment. Ask for 2-3 structural approaches. For example:
   - Option A: Chronological — childhood through present, 8 chapters
   - Option B: Thematic — organized around 5 major themes
   - Option C: Pivotal moments — structured around 6 turning points with context chapters between

   Each option includes: the editorial thesis it implies, chapter list with descriptions, pros/cons (what it highlights, what it underserves).

2. **User selects and refines** (interactive, no LLM until feedback) — User picks an approach or mashes up elements. "I like chronological but want a thematic chapter on music that cuts across eras." Renames, reorders, merges, splits chapters.

3. **Iterate** (1 LLM call per iteration) — After each round of feedback, the LLM adjusts. "Given your preference for chronological with a music chapter, here's the revised structure with music slotted after college, pulling from material across eras X, Y, Z."

4. **Lock the structure** (code, no LLM) — Once happy, the structure is saved as the canonical book plan. Becomes the organizing principle for Stage 5.

**LLM cost: ~3-8 calls across the whole iterative process.** Low volume, high value — quality matters more than speed.

## Stage 3: Corpus-Level Analysis

**What it is:** The analytical layer that sits between raw interview material and structural decisions. This is where all the interviews have been processed and structured intelligence exists about the whole body of material.

**Produces** (the inputs Stage 4 needs):
- **Entity/relationship graph**: All the people, places, organizations mentioned. How they relate. How relationships evolved over time. ("Maria: sister. Close in childhood. Estranged 1992-2005. Reconnected after mother's death.")
- **Timeline**: Major events placed in chronological order with approximate dates. Life periods identified (childhood in rural Ohio, college years, first job in Chicago, etc.)
- **Theme map**: Recurring themes identified and tagged to specific interview moments. (Resilience appears in: interview 3 at 12:40, interview 7 at 8:15, interview 12 at 22:30)
- **Coverage map**: Which life periods/topics are deeply explored vs. barely touched. Where are the gaps?
- **Emotional peaks**: The moments of highest emotional intensity across all interviews — these often become the anchors of the best chapters
- **Contradictions and evolution**: Where the subject told a different version of the same story, or where their perspective visibly shifted across sessions
- **The subject's self-identified pivotal moments**: Extracted from moments where the subject explicitly says "that changed everything" or equivalent

**Consumes:**
- All interview transcripts (raw)
- All interview metadata (when, what topic, how long)
- A structured index of interview content (segment indices from Stage 2)
- The accumulated knowledge graph (built incrementally by Stage 2)

**Key insight:** If Stage 2 builds a knowledge graph incrementally after each interview, Stage 3's outputs may just be *queries against that graph*. The graph IS the corpus analysis, accumulated over time. Stage 3 might not be a separate pipeline — it might be a set of views/queries over Stage 2's accumulated output.

### Timing, Implementation, and Process

**When:** Two modes:
- **Continuous accumulation** — the knowledge graph, timeline, and entity map grow with each interview. Stage 2 handles this automatically. No separate trigger needed.
- **On-demand synthesis** — when the user (or system) wants a higher-order view: "where are we?" This could be triggered by the user opening a "book overview" screen, automatically after every N interviews (say every 5), or when the user signals readiness to start the book.

Some analysis genuinely requires seeing the whole — theme identification across 30 interviews, the overall life arc, what the book is *about*. These higher-order patterns don't emerge from processing individual interviews.

**Implementation:** The "continuous" part is just the knowledge graph from Stage 2 — already built. Queries against it produce:
- Entity/relationship graph → query all Entity and Relationship records for this book
- Timeline → query all Events, ordered by temporal metadata
- Coverage map → compare life periods with entities/events against a rough "full life" template, or just show what exists and let the user see gaps

The "on-demand synthesis" part is a separate async job (Inngest function), triggered by user action or schedule. It produces the higher-order outputs: theme map, self-identified pivots, a high-level life summary, and qualitative coverage assessment.

**Process:**

1. **Assemble inputs** (code, no LLM) — Pull all interview summaries, the full knowledge graph (entities, relationships, events with temporal metadata), all segment indices, all threads and contradictions. This is the "corpus dossier."

2. **Theme identification** (1-2 LLM calls) — Feed the LLM the interview summaries + entity/relationship data. "What themes recur across these interviews? For each theme, which interviews and segments is it most present in?" If the corpus is too large for one context window, do it hierarchically: cluster by era/topic, identify themes within clusters, then identify themes spanning clusters.

3. **Arc and pivot identification** (1 LLM call) — Feed the LLM the timeline + interview summaries + emotional peaks. "What is the overall arc of this life story? What are the 5-7 pivotal moments? What does the subject seem to think their life is about?"

4. **Coverage assessment** (1 LLM call, or purely algorithmic) — May not need an LLM. Timeline with life periods + counts of segments/entities/events per period algorithmically identifies sparse areas. An LLM can add qualitative assessment: "The 20s are well-covered factually but lack emotional depth — lots of events, few feelings."

5. **Produce synthesis document** (1 LLM call) — Combine theme map, arc, pivots, and coverage into a single structured document. This becomes the input for Stage 4.

**LLM cost: ~4-5 calls per synthesis run.** Runs infrequently (every 5 interviews, or on-demand). Operates on summaries and graph data, not raw transcripts, so context usage is efficient.

## Stage 2: Post-Interview Processing (The Async Pipeline)

**What it is:** The work that happens after each interview ends. This is the biographer listening back to the tape, making their time-coded index, writing field notes, flagging things for follow-up. It runs after every interview, and its outputs accumulate into the corpus that Stage 3 queries.

**Produces per interview:**
- **Interview summary**: A concise narrative of what was covered in this session (not a transcript — a 1-2 page summary of content and emotional arc)
- **Segment index**: The interview broken into topical segments, each with: topic description, key people mentioned, approximate era being discussed, emotional intensity
- **Entity extractions**: People, places, events mentioned — with temporal context (when was this true?) and relationship context (how does this connect to other entities?)
- **New threads identified**: Topics that came up but weren't fully explored — candidates for future interviews
- **Contradictions flagged**: Anything that conflicts with what was said in prior interviews
- **Updated knowledge graph**: New nodes and edges added to the growing graph (entities, relationships, temporal facts)
- **Updated "book briefing"**: A curated context package for the next interview — key threads to follow up, gaps to explore, relationships to probe deeper

**Consumes:**
- The full transcript of the just-completed interview
- The core memory block from that interview (the AI's "mental model" at end of session)
- The existing knowledge graph (to merge new information into)
- The existing corpus of prior interview summaries and segment indices
- The book's current topic/area plan (if one exists — to assess coverage)

### Timing, Implementation, and Process

**When:** Once, triggered when an interview ends. Async — the user doesn't wait. They close the interview, the job fires in the background. If it fails, it retries. Results available before the next interview starts (or at worst, during — the system handles the case where processing isn't done yet).

**Implementation:** An Inngest function triggered by an `interview.completed` event (ADR 020 already chose Inngest). A pipeline of steps, some parallel, some sequential. Inngest step functions are a good fit — each step is independently retryable.

Outputs stored as structured data:
- Interview summary → text field on the Interview (or a related InterviewAnalysis record)
- Segment index → InterviewSegment records (interviewId, startMessageIndex, endMessageIndex, topic, people[], era, emotionalIntensity)
- Entity/relationship extractions → Entity and Relationship tables with temporal columns (can start in Postgres, migrate to a graph DB later if needed)
- Threads and contradictions → typed records the briefing generator can query

**Process:**

1. **Segment the interview** (1 LLM call) — Take the full transcript and break it into topical segments. Each gets: topic label, message range, approximate era, key people mentioned, emotional intensity (low/medium/high). This is a chunking/indexing task — the LLM is organizing, not interpreting. Prompt: give it the full transcript, ask it to identify natural topic boundaries. "The subject started talking about childhood, shifted to mother's illness at message 12, moved to college at message 23."

2. **Extract entities and relationships** (1-2 LLM calls) — From the transcript, identify all people, places, organizations, and significant events. For each: what was said about them, temporal context (when was this true), relationships to other entities. Prompt: give the transcript (possibly segment by segment if long), ask for structured JSON extraction. "List every person mentioned, their relationship to the subject, any temporal details."

   Then a **resolution step**: compare extracted entities against the existing knowledge graph. Is "Mom" the same as "Catherine" from a prior interview? Is "the company" the same as "Acme Corp"? Could be a second LLM call (new extractions + existing entities → merge decisions), or a simpler heuristic pass (exact name match, alias detection) with LLM fallback for ambiguous cases.

3. **Update the knowledge graph** (code, no LLM) — Persist resolved entities and relationships. New entities created, existing entities updated. Temporal edges preserved — "Maria was close in childhood" sits alongside "Maria was estranged in the 1990s." Contradictions flagged, not resolved — both versions kept with source interview and timestamp.

4. **Generate interview summary** (1 LLM call) — Produce a 1-2 page narrative summary. Not transcript condensation — a summary of what was covered, what was significant, what emotional moments stood out, what was left unfinished. Biographer's field notes. Prompt: give the transcript + segment index (from step 1), ask for structured summary. The segment index helps it organize — summarize per segment, then synthesize.

5. **Identify threads and gaps** (1 LLM call) — Compare this interview against the existing knowledge graph and prior interview summaries. What new threads opened? What prior threads got deepened? What was mentioned but not explored? What contradicted prior sessions? Prompt: current interview summary + knowledge graph summary + prior interview summaries. "What new threads emerged? What got addressed? What to follow up? What contradictions appeared?"

6. **Generate curated briefing** (1 LLM call, or deferred to interview start) — This might be better deferred to when the next interview starts, because the user will choose a topic and that affects relevance. But a "standing briefing" could be generated now and refined at start time. Includes: 3-5 most promising follow-up threads, contradictions worth probing, key people/events from prior interviews relating to likely upcoming topics, coverage gaps.

**Steps 1, 2, and 4 can run in parallel** (all read the transcript independently). Steps 3 and 5 depend on prior steps. Step 6 depends on step 5.

**LLM cost: ~5-6 calls per interview, running async.** At ~$0.10-0.30 per call (depending on transcript length and model), that's $0.50-1.80 per interview.

## Stage 0: Onboarding + Interview Planning

**What it is:** Before any interviews happen, the system needs to learn enough about the subject to plan intelligently. Instead of browsing a catalog of generic questions, the user has a short intake conversation — not a form, a conversation. The LLM asks a few open questions ("Tell me a bit about yourself," "What periods of your life feel most important?", "Who are the key people in your story?") and from that, generates a personalized interview plan.

The interview plan is a **living document** — not a fixed script. It starts broad (childhood, family, career, the big arcs) and gets more focused as later interviews reveal what matters. After each interview, Stage 2's outputs (new threads, coverage gaps, contradictions) feed back into the plan, adding targeted follow-up sessions. This is Caro's concentric circles: start wide, spiral inward.

**Produces:**
- **Initial core memory block** — bootstrapped from onboarding. The interviewer's mental model of this person before the first real interview: key people, rough life arc, what the subject cares about most. This means interview #1 already knows the subject's name, family structure, and broad context.
- **Interview plan** — an ordered set of suggested interview topics, each with a brief description and rationale. Broad topics first ("Growing up in rural Montana — family dynamics, small-town life, early independence"), with room for the plan to evolve. Not rigid questions — areas of focus with enough context to guide a rich conversation.
- **The subject's own priorities** — what *they* want to capture. This informs everything downstream, including the editorial thesis in Stage 4.

**Consumes:**
- Nothing — this is the starting point. Just the user showing up.

### Timing, Implementation, and Process

**When:** Once at the very beginning, before the first interview. The onboarding conversation is short (10-15 minutes, maybe 8-12 exchanges). The initial plan is generated immediately after. Then the plan **evolves continuously** — after each interview, Stage 2's thread/gap identification feeds back into the plan, adding or reprioritizing topics.

The user can also override at any time: "I want to talk about X next" feeds directly into the plan regardless of what the system suggested. The plan guides; it doesn't constrain.

**Implementation:** A distinct onboarding conversation mode — different from the interview UI. Shorter, more structured, with a clear "done" state. Could be a dedicated page the user hits when they create a new book.

The interview plan is a list of InterviewTopic records on the Book: title, description, rationale, status (suggested/completed/skipped), source (onboarding vs. Stage 2 suggestion vs. user-requested), and priority ordering. The plan evolves as Stage 2 adds new topics and the user completes or skips existing ones.

The initial core memory block produced here becomes the seed for Stage 1. It lives on the Book record and gets updated by every subsequent interview.

**Process:**

1. **Onboarding conversation** (8-12 LLM calls — one per turn of the intake) — The LLM conducts a short, guided conversation. Unlike the interviews (which are open-ended and follow the subject), this is more structured: the LLM has specific information it's trying to gather (who is this person, what's the shape of their life, what matters to them, who are the key people). But it's still conversational, not a form — the LLM follows up naturally on what the subject shares.

   Input per turn: ~4-6k tokens (lighter system prompt than interviews, no memory block yet, short conversation history). Output per turn: ~200-400 tokens (shorter responses — asking questions, not storytelling).

2. **Generate initial plan** (1 LLM call) — After onboarding completes, feed the full onboarding transcript to the LLM and ask it to produce: (a) an initial core memory block, and (b) an interview plan of 8-15 suggested topics, ordered from broad/comfortable to focused/deeper.

   Input: ~5-10k tokens (onboarding transcript + planning prompt). Output: ~2-4k tokens (memory block + structured topic list).

3. **Plan evolution** (no additional LLM cost — piggybacks on Stage 2) — After each interview, Stage 2's "identify threads and gaps" step already produces new thread candidates and coverage gap analysis. These feed directly into the plan as new suggested topics. The briefing generator (Stage 2, step 6) considers the plan when deciding what to highlight for the next interview.

**LLM cost: ~$0.50-1.50 per book** (one-time onboarding). The per-turn costs are small (short conversations, light context), and the plan generation is a single call. Plan evolution is free — it's a byproduct of Stage 2 processing that already happens.

## Stage 1: The Interview Itself

**What it is:** The live conversation between the AI interviewer and the subject. The primary goal is conversation quality — drawing out rich, detailed, emotionally authentic stories.

**Produces:**
- The **raw transcript** (messages + timestamps) — this is the primary artifact, the "recording"
- An **updated core memory block** — the AI's evolving mental model of the subject, updated throughout the conversation. Small, structured, always-present. Contains: key people referenced in this session, major events discussed, emotional tone, active threads, and a brief narrative of what was covered.
- The **conversation itself** as an experience for the subject — this matters. The quality of the interview affects what the subject shares.

**Consumes (at the start of each interview):**
- The core memory block (cumulative across all prior interviews — the AI's "mental model" of this person)
- A curated briefing from the async pipeline: suggested threads to follow up, gaps to explore, relevant context from prior sessions
- The topic/area for this session (chosen by user or suggested by the system)
- The system prompt with interviewing instructions

### Timing, Implementation, and Process

**When:** User-initiated, real-time. Runs continuously for the duration of a session (maybe 20-60 minutes). Could happen daily, weekly, or sporadically — the system can't assume a cadence.

**Implementation:** Already exists as a chat interface. The main change: swap the current insight extraction (3-6 structured insights per message, appended to a growing list) with a **core memory block** the LLM updates in place each turn.

The core memory block is a text field on the Book (not the Interview — it persists across interviews). ~2-5k characters. The LLM receives it as part of context and returns an updated version alongside its conversational response (similar to the current `newInsights` in the JSON response format). The block overwrites the previous version each turn — a living document, not a log.

The curated briefing (from Stage 2) is a separate read-only block injected at interview start. The LLM can reference it but doesn't update it.

**Process:**

Each turn:
1. **Assemble context**: system prompt + core memory block + curated briefing (if not the first interview) + conversation summary + recent messages
2. **Send to LLM**. Response format includes both the conversational reply and the updated core memory block.
3. **Save the updated core memory block** to the Book record.
4. **Save the message pair** (user + assistant) to the transcript.
5. **Summarize if needed** — if conversation exceeds the sliding window threshold, run the existing summarization.

The core memory block prompt instructs the LLM to maintain:
- **Key people** mentioned so far (names + one-line relationship — "Maria, sister, close in childhood")
- **Where we are** in the life story (era/period being discussed)
- **Active threads** to follow up on (2-3 max, most recent/promising)
- **Emotional landscape** of this session (one line — "subject became animated discussing college, guarded about father")
- **Brief narrative** of what's been covered (3-5 sentences, updated not appended)

The LLM's job is to keep this concise — when something new displaces something old, the old thing drops off or gets compressed. This is the biographer's fuzzy mental index, not a comprehensive record.

**LLM cost: 1 call per turn (existing).** No additional overhead vs. current system — the core memory block replaces insight extraction, it doesn't add to it.

## Pipeline Summary

| Stage | When | LLM Calls | Key Data Produced |
|-------|------|-----------|-------------------|
| **0. Onboarding + Planning** | Once at start, then evolves via Stage 2 | 9-13 (onboarding) + 1 (plan) | Initial core memory block, interview plan |
| **1. Interview** | Real-time, user-initiated | 1 per turn (existing) | Raw transcript, core memory block |
| **2. Post-Processing** | Once per interview, async | 5-6 | Segment index, entities, graph updates, summary, threads, briefing |
| **3. Corpus Analysis** | Incremental + on-demand | 0 (incremental) / 4-5 (synthesis) | Theme map, arc, pivots, coverage assessment |
| **4. Macro Structure** | User-initiated, iterative | 3-8 across iterations | Editorial thesis, chapter plan |
| **5. Chapter Dossiers** | Batch after structure locked | 2-3 per chapter | Organized source material, quotes, readiness |
| **6. Rough Draft** | Per-chapter, with revision loop | 2-5 per chapter + revisions | Prose manuscript with source attribution |
| **7. Polish** | After all chapters drafted | 5-15 across manuscript | Final manuscript, export |

The heaviest LLM usage is in Stages 5-7 (book creation), not Stages 1-3 (interview + processing). That's good — Stages 5-7 are infrequent batch processes, not real-time conversation. The real-time path (Stage 1) stays lightweight, and the per-interview async work (Stage 2) is a manageable 5-6 calls.

## Cost Analysis

Rough estimates for a mid-size book: **25 interviews, ~30 turns each, 10 chapters.** Pricing based on a mid-tier model (~$3/1M input, ~$15/1M output — roughly Sonnet-class, early 2025). Where a cheaper model could handle the work, noted.

### Stage 0: Onboarding + Interview Planning — $0.50-1.50 per book

One-time cost. The onboarding conversation is short and lightweight — less context per turn than a full interview, shorter responses (the LLM is asking questions, not storytelling).

**Onboarding conversation (~10 turns):**
- Input per turn: ~4-6k tokens (light system prompt, growing conversation). Average ~5k.
- Output per turn: ~200-400 tokens (questions + brief acknowledgments). Average ~300.
- Cost for 10 turns: ~$0.20

**Plan generation (1 call):**
- Input: ~5-10k tokens (onboarding transcript + planning prompt)
- Output: ~2-4k tokens (core memory block + structured topic list)
- Cost: ~$0.06-0.09

**Total: ~$0.26-0.29** at Sonnet-class. The range up to $1.50 accounts for longer onboarding conversations or a premium model for plan quality.

*Plan evolution after each interview is free — it's a byproduct of Stage 2's thread/gap identification that already happens.*

### Stage 1: The Interview — $25-45 per book

This is the existing cost — it doesn't change with the new architecture. The core memory block replaces insight extraction; net LLM cost per turn is roughly the same.

**Per turn:**
- Input: ~6-12k tokens (system prompt ~2k, core memory block ~1.5k, briefing ~1k, conversation summary ~1-3k, recent messages ~1-4k). Grows as the conversation progresses — early turns ~6k, late turns ~12k. Average ~9k.
- Output: ~700-1.5k tokens (conversational response ~300-800, updated memory block ~400-700). Average ~1k.
- Cost per turn: ~$0.04

**Per interview (30 turns):** ~$1.20
**25 interviews:** ~$30

*Note: This is the one stage where latency matters — it's the real-time conversation path. Model choice is constrained by response speed as much as cost.*

### Stage 2: Post-Interview Processing — $10-20 per book

All async, no latency pressure. Some steps could use a cheaper model (segmentation, entity extraction are more mechanical), but entity resolution and thread identification benefit from a smarter model.

**Per interview:**

| Step | Input tokens | Output tokens | Estimated cost |
|------|-------------|---------------|----------------|
| Segment the interview | 12-20k (full transcript) | 2-4k (structured segments) | $0.07-0.12 |
| Extract entities/relationships | 12-20k (transcript) | 2-4k (structured JSON) | $0.07-0.12 |
| Entity resolution | 5-15k (new extractions + existing graph) | 1-3k (merge decisions) | $0.03-0.09 |
| Interview summary | 15-25k (transcript + segment index) | 1-3k (narrative summary) | $0.06-0.12 |
| Threads and gaps | 10-25k (summary + graph + prior summaries) | 1-2k (threads list) | $0.05-0.11 |
| Curated briefing | 10-20k (similar to above) | 1-2k (briefing doc) | $0.05-0.09 |

**Per interview total: $0.33-0.65**
**25 interviews: $8-16**

The input size for steps 5-6 grows over time — interview #25's "prior summaries" input is larger than interview #3's. Early interviews are cheap; later ones cost more because there's more context to compare against.

*Could save ~30-40% by using a cheaper model for steps 1-2 (mechanical extraction). Entity resolution (step 3) and thread identification (step 5) need a smarter model.*

### Stage 3: Corpus-Level Analysis — $1-4 per book

Runs infrequently — maybe 3-5 times across the life of a book (every ~5-8 interviews, plus a final run before book planning). Operates on summaries and graph data, not raw transcripts, so inputs are compact relative to the information they represent.

**Per synthesis run:**

| Step | Input tokens | Output tokens | Estimated cost |
|------|-------------|---------------|----------------|
| Theme identification | 25-50k (all interview summaries + entity data) | 3-5k (theme map) | $0.12-0.23 |
| Arc and pivot identification | 20-45k (timeline + summaries + emotional peaks) | 2-4k (arc + pivots) | $0.09-0.20 |
| Coverage assessment | 10-25k (timeline + entity counts by period) | 1-3k (assessment) | $0.05-0.12 |
| Synthesis document | 10-15k (outputs from above steps) | 3-5k (structured synthesis) | $0.08-0.12 |

**Per synthesis run: $0.34-0.67**
**3-5 runs: $1-3.50**

*The main scaling concern: by the final synthesis run (25 interviews), the "all interview summaries" input could push 50-60k tokens. Still within context window limits, but getting chunky. Could compress prior summaries or use a hierarchical approach for the final run.*

### Stage 4: Macro Structure — $0.50-2 per book

Low volume, interactive. The human is in the loop making decisions, so there's natural pacing. The LLM inputs are compact (synthesis document + structure-so-far), but the output needs to be thoughtful.

**Per iteration:**
- Input: ~8-15k tokens (synthesis document ~5-10k, current structure ~2-4k, user feedback ~200-500)
- Output: ~3-5k tokens (revised structure with descriptions)
- Cost per iteration: ~$0.07-0.12

**Initial proposal (richer output, 2-3 options): ~$0.15-0.25**
**3-5 refinement iterations: ~$0.21-0.60**
**Total: ~$0.36-0.85**

*This is one stage where using a premium model (Opus-class) might be worth it — structural/editorial decisions benefit from deeper reasoning, and the volume is tiny.*

### Stage 5: Chapter Dossiers — $3-8 per book

Batch process, per-chapter. The main cost driver is how much transcript material gets pulled in for quote extraction — for well-covered chapters, the candidate segments could be substantial.

**Per chapter:**

| Step | Input tokens | Output tokens | Estimated cost |
|------|-------------|---------------|----------------|
| Map + curate source material | 8-20k (chapter desc + candidate segments + graph slice) | 3-5k (curated dossier) | $0.07-0.14 |
| Extract key quotes | 8-20k (relevant transcript segments) | 2-4k (quotes with context) | $0.06-0.12 |
| Readiness assessment | 4-8k (dossier + coverage data) | 500-1k (assessment) | $0.02-0.04 |

**Per chapter: $0.15-0.30**
**10 chapters: $1.50-3.00**

*The wide range depends on how "rich" vs. "thin" chapters are. A well-covered childhood chapter might pull 20k tokens of candidate segments; a thin "early career" chapter might only have 5k.*

### Stage 6: Rough Draft — $5-18 per book

The most LLM-intensive stage by token volume. Writing prose means large outputs, and the inputs include dossiers, voice guides, and prior chapter context for continuity. This is also where model quality matters most — cheap models write cheap prose.

**One-time setup:**
- Voice profile: ~15-25k input (representative transcript samples), ~1.5-2.5k output → $0.07-0.11

**Per chapter (initial draft):**
- Input per call: ~8-15k tokens (chapter dossier ~5-8k, voice guide ~1.5k, thesis ~500, prior chapter ending ~1-2k for continuity)
- Output per call: ~3-6k tokens (2-4 pages of prose)
- Calls per chapter: 1-3 (short chapter = 1 call, long chapter = 2-3 sections)
- Cost per chapter initial draft: $0.07-0.24

**Per chapter (revisions, ~2 rounds average):**
- Input per revision: ~6-12k tokens (current draft section ~3-6k, dossier context ~2-4k, user feedback ~200-500)
- Output per revision: ~2-5k tokens (revised section)
- Cost per revision: $0.05-0.11
- Cost for 2 revisions: $0.10-0.22

**Per chapter total: $0.17-0.46**
**10 chapters + voice profile: $1.80-4.70**

*This estimate assumes Sonnet-class. If using a premium model for prose quality (probably worth it — this is the product), multiply by ~4-5x: $7-24 per book. That's still very reasonable for producing an actual book.*

### Stage 7: Polish — $3-12 per book

Similar to Stage 6 in that it's operating on prose, but the inputs are larger (full chapters or multi-chapter windows for continuity checking) and the outputs are more targeted (specific edits vs. full rewrites).

**Consistency pass:**
- Input: ~15-25k per window (2-3 chapters at a time), 4-5 overlapping windows
- Output: ~1-3k per window (issue list)
- Cost: $0.24-0.58

**Voice calibration (per chapter):**
- Input: ~6-12k (chapter text + voice guide)
- Output: ~4-8k (revised chapter — mostly unchanged, targeted fixes)
- Cost per chapter: $0.08-0.16
- 10 chapters: $0.80-1.60

**User-directed revisions (~5-10 across manuscript):**
- Input per revision: ~6-12k, output ~2-5k
- Cost: $0.30-0.85

**Total: $1.34-3.03**

*Again, if using a premium model: $5-15. The consistency and voice passes in particular benefit from a model that can hold nuance across large contexts.*

### Total Cost Per Book

| Stage | Sonnet-class | Premium (Opus-class for Stages 4-7) |
|-------|-------------|--------------------------------------|
| 0. Onboarding + Planning | $0.50-1.50 | $0.50-1.50 |
| 1. Interview | $25-45 | $25-45 (keep Sonnet for latency) |
| 2. Post-Processing | $10-20 | $10-20 (keep Sonnet, async anyway) |
| 3. Corpus Analysis | $1-4 | $4-16 |
| 4. Macro Structure | $0.50-2 | $2-8 |
| 5. Chapter Dossiers | $3-8 | $12-32 |
| 6. Rough Draft | $2-5 | $7-24 |
| 7. Polish | $1.50-3 | $5-15 |
| **Total** | **$44-89** | **$66-162** |

### What This Tells Us

**Stage 1 dominates.** ~60% of total cost is the interviews themselves — 750 LLM calls (25 interviews × 30 turns). This cost exists today and doesn't change with the new architecture. Everything else is incremental.

**The incremental cost of the full pipeline (Stages 2-7) is $18-42** on Sonnet-class, or **$40-115** with premium models for book creation. For a product that produces an actual biography, this is remarkably cheap.

**Stage 2 is the second biggest cost** (~$10-20) because it runs 25 times. But per-interview it's well under $1 — very manageable for async background work.

**Stages 4-7 (book creation) total just $7-18 on Sonnet-class.** These are infrequent, high-value operations. The volume is low; the value is high. This is where splurging on a premium model is most justified.

**The scaling variable is interview count, not chapter count.** Going from 25 to 50 interviews roughly doubles Stage 1-2 costs but barely affects Stages 3-7. The pipeline is designed so that more interviews = richer source material without proportionally more book-creation cost.

*All estimates assume early-2025 pricing. LLM costs have been dropping ~50% per year; by the time Stages 4-7 are built, these numbers may be significantly lower.*

## Key Observations

1. **The interview only needs to produce two things:** the raw transcript and a lightweight core memory block. Everything else is derived downstream. This confirms the "do less inline" instinct.

2. **Stage 2 (post-interview processing) is the workhorse.** It's where the most structured data gets created, and it runs async so cost/latency are less constrained. This is where a temporal knowledge graph earns its keep.

3. **Stage 3 might not be a separate pipeline.** If Stage 2 builds a knowledge graph incrementally, Stage 3's outputs (entity graph, timeline, theme map, coverage map) may just be queries against that graph. The graph IS the corpus analysis, accumulated over time.

4. **Stages 4-7 are the "book creation" product** — a distinct feature set that consumes the graph and transcript corpus. We don't need to build this now, but we need the data pipeline (Stages 1-3) to produce what it will eventually need.

5. **The "curated briefing" for the next interview is the bridge** between the async pipeline and the live conversation. It's the biographer's prep sheet. It should be generated at interview start time (not after the prior interview), because it should factor in what topic the user chose for this session.

## Related Documents

- [LLM-Driven Interview Planning](../ideas/llm-driven-interview-planning.md) — the original idea that became Stage 0
- [Insights Strategy](./insights-strategy.md) — industry research on memory systems and how they apply to Telltale
- [Raw Interviews to Biography](./raw-interviews-to-biography.md) — the synthesis pipeline (forward direction)
- [Story Creation Flow](./story-creation-flow.md) — end-to-end product flow
