# Insights Strategy

> Strategic analysis of how insights fit into the broader biography creation vision, including industry research on conversational memory systems and how they apply to Telltale.

## Context

Telltale's vision: AI-powered interviews capture rich raw material, then that material gets assembled into a compelling biography. Insights are the bridge between those two phases — the structured intelligence that makes raw transcripts tractable. This analysis examines whether insights are set up to serve that role.

## The Three Jobs Insights Need to Do

Looking across all the docs, insights currently serve **one** job but need to serve **three**:

### Job 1: Interviewer Memory (Working Today)

The AI's scratch pad during a single interview. Tracks names, events, emotions, unexplored threads so the interviewer can reference earlier details and follow up intelligently. Survives context window summarization by being loaded fresh from the DB each turn.

**Status:** Functional. This is what insights do today.

### Job 2: Cross-Interview Continuity (Infrastructure Ready, Not Wired)

When starting interview #5, the AI should know what happened in interviews #1-4. "You mentioned your sister Maria in our childhood conversation — how did that relationship evolve as you got older?" The repository method `findByBookId()` exists. The context service only calls `findByInterviewId()`.

**Status:** One wiring change away from working. This is the single highest-impact gap.

### Job 3: Index for Book Creation (Vision, Not Started)

When it's time to assemble a biography, someone (AI or human) needs to answer: Who are the key people? What are the pivotal moments? What themes recur? Where are the gaps? Insights are the only structured data layer between raw transcripts and narrative output. Without them functioning as an index, the synthesis pipeline described in `raw-interviews-to-biography.md` has to start from scratch on every pass.

**Status:** Not designed for this yet. Current insight types are interviewer-facing, not biographer-facing.

## How the Current Types Map to Each Job

| Type | Job 1 (Memory) | Job 2 (Cross-Interview) | Job 3 (Book Index) |
|------|:-:|:-:|:-:|
| ENTITY | Strong | Strong — names/people carry across interviews | Partial — gives character list, but no relationship map |
| EVENT | Strong | Medium — events are interview-specific but context helps | Partial — events exist but lack temporal anchoring or significance scoring |
| EMOTION | Strong | Medium — emotional context carries forward | Strong — emotional peaks become chapter highlights |
| DETAIL | Strong | Strong — unexplored threads are exactly what the next interview should probe | Weak — "unexplored" is an interview concern, not a book concern |

**Key gap:** None of the types capture **thematic significance**, **temporal placement**, or **narrative weight**. The biographer needs to know not just *what* was mentioned, but *when it happened*, *what theme it belongs to*, and *how important it is to the overall arc*.

## The Scaling Problem

Before diving into solutions, the scaling math matters. The current system extracts 3-6 insights per user message. An interview might run 20-40 exchanges, producing **60-240 insights per interview**. With an estimated 30-100 interviews per book, that's **1,800-24,000 insights total**.

Even within a single interview, by message 30 the system could be injecting 150+ insights every turn — most of them stale. The AI already knows "Maria is the subject's sister" but gets reminded for the 80th time. This burns context window on redundant information.

This scaling concern applies to both Job 1 (within-interview) and Job 2 (cross-interview). The current "extract flat insights and inject all of them" approach is a naive version of what the industry calls a key-value memory store, but without any retrieval intelligence. The question isn't just *what* to extract — it's *how to bound and surface the right context at the right time*.

## How the Industry Solves This

Jobs 1 and 2 are fundamentally about **bounding and surfacing the right context at the right time**. Job 3 is a **corpus-level indexing problem** that probably shouldn't be solved inline during conversation. This section surveys five industry approaches to the bounding/surfacing problem, evaluated through Telltale's lens.

### Approach 1: Tiered Memory (MemGPT/Letta)

**How it works:** Inspired by OS virtual memory. The context window is divided into fixed sections: a small "core memory" (always present, ~2-5k chars) containing key facts about the user/agent, a FIFO queue of recent messages, and a recursive summary of evicted older messages. The LLM gets tools (`core_memory_append`, `core_memory_replace`, `archival_memory_search`, `archival_memory_insert`) and manages its own memory. When context hits ~70% capacity, the system warns the LLM to save important info, then evicts and summarizes the oldest messages. External "archival memory" lives in a vector DB for semantic search when needed.

**Per-turn flow:**
1. Assemble context: system prompt + core memory blocks + summary + recent messages + tool definitions
2. LLM generates inner monologue (private) + a function call
3. If the call is a memory operation (save, search, update), execute it and re-run the loop
4. If the call is `send_message`, deliver the response and stop
5. A single user message can trigger multiple LLM inference passes (think → search → think → save → think → respond)

**What it takes to build:**
- Token-counting context assembler
- FIFO message queue with eviction + recursive summarizer
- Vector DB for archival storage (pgvector, Qdrant, etc.)
- Tool definitions + executor for memory operations
- Careful system prompt engineering (the hardest part — must teach the LLM when/how to manage its own memory)

**Assessment for Telltale:** The core idea — bounded "always loaded" memory blocks + searchable external storage — is directly applicable. But the full MemGPT loop adds significant latency (multiple LLM passes per turn) and cognitive overhead (every token the model spends on memory management is a token not spent on interviewing). Even the Letta team is moving away from some of these patterns in their V1 rewrite. **The useful piece is the core memory block concept** — a small, always-present structured summary that gets updated rather than accumulated endlessly.

**Key weakness:** The LLM can make bad memory management decisions — forget to save important info before eviction, overwrite good content, or fail to search when it should. No external validation of its choices.

### Approach 2: Hybrid Retrieval (Mem0)

**How it works:** On each message, an LLM extracts candidate facts from the conversation. Each fact is embedded and compared against existing memories via vector search. A second LLM call decides per-fact: ADD (new), UPDATE (merge with existing), DELETE (contradicted), or NOOP (already captured). Retrieval queries all three stores: vector (semantic similarity), key-value (quick fact lookup), and optionally graph (entity relationships). Results are merged and injected as context.

**Per-turn flow:**
1. Extract candidate facts from the message (LLM call #1)
2. For each fact: embed it, find top-10 similar existing memories, ask LLM to decide ADD/UPDATE/DELETE/NOOP (LLM call #2 per fact)
3. If graph enabled: extract entities + relationships in parallel (LLM calls #3-5)
4. At retrieval time: embed query, cosine similarity search, optional reranking, return top-k

**What it takes to build:**
- Fact extraction prompt + LLM call
- Embedding model + vector DB
- AUDN decision prompt + LLM call (per extracted fact)
- Optionally: graph DB for entity relationships
- History/audit log

**Assessment for Telltale:** Independent benchmarks are concerning. Cost: ~12.5x more than naive long-context (1,028 LLM calls per test case in one benchmark). Precision: 49.3% vs 84.6% for just stuffing everything in context. Write latency: 154 seconds average per interaction. And critically: **errors happen at write time and are permanent** — if the extraction LLM misinterprets something, corrupted data enters the DB forever. This architecture works better for preference-tracking (chatbots remembering you like dark mode) than precise biographical recall where factual accuracy matters enormously.

**Key weakness:** Conflates semantic memory (fuzzy preferences suitable for lossy compression) with working memory (exact facts that cannot tolerate corruption). For a life-story platform, this distinction is critical.

### Approach 3: Temporal Knowledge Graph (Zep/Graphiti)

**How it works:** Each message becomes an "episode" node. A pipeline of 6+ focused LLM calls runs (in parallel where possible): extract entities, deduplicate against existing nodes, extract relationships as edges, deduplicate edges, extract temporal metadata, and invalidate contradicted edges. Everything lives in a graph DB with bi-temporal timestamps: when the fact was true in the real world (`valid_at`/`invalid_at`), and when the system learned about it (`created_at`/`expired_at`). Old edges are invalidated, not deleted — history is preserved.

**Per-turn flow:**
1. Create episode node from the message
2. Entity extraction: LLM identifies people, places, events (with reflexion loop for completeness)
3. Entity resolution: embed each entity, hybrid search for duplicates, LLM disambiguates
4. Edge extraction: LLM identifies relationships between entities as natural-language facts
5. Edge deduplication: embed edges, search for duplicates between the same entity pair
6. Temporal extraction: LLM determines when each fact became/stopped being true
7. Edge invalidation: detect contradictions with existing edges, mark old ones invalid
8. Persist everything atomically

**Retrieval (zero LLM calls, <100ms):**
- Cosine semantic similarity on entity/edge embeddings
- BM25 full-text keyword search
- Breadth-first graph traversal from initial results
- Configurable reranking (reciprocal rank fusion, MMR, cross-encoder)

**What it takes to build:**
- Graph database with vector index support (Neo4j most mature, or FalkorDB, Kuzu)
- 6+ focused extraction prompts with structured output
- Embedding pipeline for nodes and edges
- Hybrid search (semantic + BM25 + graph traversal)
- Bi-temporal data model (4 timestamps per edge)
- Community detection for topic clustering

**Assessment for Telltale:** The most architecturally interesting option and the strongest domain fit. Tracking people, relationships, and how they evolve over decades is literally what this was designed for. "Maria was close in childhood, estranged in the 1990s" lives naturally in the graph as two temporally-bounded edges on the same entity pair. Retrieval is fast and cheap (no LLM calls). Graphiti is open source (Apache-2.0).

The downsides are real: 6-12 LLM calls per message for ingestion (~4 seconds optimized), entity resolution is the hardest problem (if it fails, the same person becomes multiple nodes and knowledge fragments), and it's the most complex to build and maintain. On benchmarks, it improved temporal reasoning by 48.2% but decreased single-session performance by 17.7% — the extraction process can lose nuance present in raw conversation.

**Key weakness:** Entity fragmentation from failed resolution; model quality dependency (smaller models struggle with the extraction prompts).

### Approach 4: Recursive Summarization

**How it works:** Maintain two sections in context: a compressed summary of older history, and verbatim recent messages. When the recent buffer exceeds a threshold (token count or message count), the oldest messages get summarized and folded into the running summary. Each new summary incorporates the previous summary + newly evicted messages. This is what Telltale already does.

**Per-turn flow:**
1. Assemble context: `[system prompt] + [summary of older history] + [last N raw messages]`
2. If buffer exceeds threshold: evict oldest messages, summarize them with existing summary (LLM call), update the running summary
3. Store raw messages always (summary is a cache)

**Variants:**
- **Simple rolling summary:** Every exchange triggers re-summarization. Constant token usage, highest information loss.
- **Summary buffer hybrid (most common):** Keep last N messages verbatim, summarize everything older. Best balance of token efficiency and fidelity. This is what Telltale uses.
- **Recursive session-boundary:** Summarize at session end, each summary folds in the previous one. Good for multi-session memory.

**What it takes to build:**
- A summarization prompt (domain-specific is critical)
- A threshold trigger
- A context assembler
- Raw message storage

**Assessment for Telltale:** Simplest approach, already working. But the fundamental problem is information loss — research shows ~10% error rate per summarization pass (2.7% fabricated facts, 3.2% incorrect relationships, 3.9% missing details), and errors compound recursively. Session 1 details that pass through 5 rounds of summarization degrade significantly. For a life-story platform, "My grandmother came from Poland in 1947" might become "family had European roots" after enough compression.

The key improvement would be a domain-specific summary prompt that explicitly preserves names, dates, relationships, and emotional moments. But summarization alone won't solve the cross-interview problem — it's a within-conversation tool.

**Key weakness:** Information loss is inherent and compounds. No self-correction mechanism — hallucinated facts in summaries propagate forward forever.

### Approach 5: Async Reflection ("Subconscious" Memory)

**How it works:** The conversation runs without memory overhead. After it ends (or during idle time), a background LLM pass processes the transcript + existing memories and produces ADD/UPDATE/DELETE operations. Production systems use debouncing — wait 30 seconds after the last message, then process the batch. The most advanced version (Google's "sleep-time compute") runs iterative background processing during idle periods, yielding ~5x token savings at inference time.

**Per-turn flow:** None — that's the point. Reflection happens between sessions:
1. Conversation happens normally (no memory extraction overhead)
2. After conversation ends (or after debounce period), background job processes the full transcript
3. An LLM extracts facts, updates, and deletions against the existing memory store
4. Next conversation starts with the updated memory available

**Production implementations:**
- **ChatGPT:** Injects 6 sections into the system prompt (bio memories, response preferences, past topics, user insights, recent content, interaction metadata). Bio tool is synchronous (model writes mid-conversation), but aggregation runs as background jobs.
- **Claude:** On-demand — agent has memory tools and decides when to use them. Client-side file storage.
- **Gemini:** Structured `user_context` document with 4 fixed sections (demographic, interests, relationships, dated events). Background periodic refresh with recent raw turns as a delta.
- **LangMem:** Debounced reflection — configurable delay (e.g., 30s), cancelled and rescheduled if new messages arrive.
- **Letta sleep-time:** Iterative background processing using `rethink_memory` tool, runs until the agent signals completion.

**What it takes to build:**
- Background job runner (task queue, thread pool, or Inngest-style async)
- Extraction/reflection prompt
- Memory store (vector DB, structured DB, or files)
- Conflict resolution logic

**Assessment for Telltale:** This is more of a "when to process" pattern than a "what to build" pattern — it pairs with any of the above approaches. The key insight is separating the conversation path from the memory processing path. The interviewer stays focused; memory extraction happens async. The downside is the latency gap: if a user starts interview #5 immediately after ending #4, the reflection from #4 might not be ready yet. For Telltale, this is probably fine since interviews are discrete sessions with natural breaks.

**Key weakness:** Delay between conversation and memory availability; extraction accuracy depends entirely on the reflection prompt quality.

## Patterns That Emerge

Looking across all five approaches, several things jump out:

1. **Extraction at write time is risky.** Both Mem0 and the summarization research show significant error rates when the LLM extracts/compresses inline. Errors are permanent and compound. The more you can defer to retrieval-time intelligence, the safer you are.

2. **Retrieval without LLM calls is fast and cheap.** Graphiti's retrieval path (semantic + keyword + graph traversal, no LLM) returns in <100ms. This matters when you're injecting context every turn of a conversation.

3. **The temporal dimension is uniquely important for Telltale.** Most memory systems track flat facts. A life story is inherently temporal — relationships evolve, people change, events have eras. The bi-temporal model is the only one that handles this natively.

4. **Async processing fits Telltale's interview model.** Interviews are discrete sessions with breaks between them. Processing happens naturally at session boundaries.

5. **"Always loaded" bounded memory + selective retrieval is the convergence point.** A small core context (always present) + a larger searchable store (pulled in when relevant) is where everyone lands.

6. **No single approach is a perfect fit.** Each has significant tradeoffs in cost, latency, accuracy, or complexity. A blend that borrows the right pieces from each — without inheriting their full complexity — is likely necessary.

## The Real-World Biographer Analogy

Before settling on a technical approach, it's worth studying how professional biographers actually solve these same problems — without any technology. The biographer's workflow maps surprisingly well to Telltale's three jobs, and the way they divide labor across phases is instructive.

### How a Biographer Handles Job 1: During the Interview

A professional biographer does **not** try to index everything in real time. They're focused on listening. Robert Caro scrawls "SU" (Shut Up) in his notebook margins as a reminder to himself — the most important thing the interviewer can do is be quiet and let the subject talk.

Real-time notes are minimal and tactical:
- Facts that might slip away (a name, a date, a place)
- Threads to come back to ("ask more about the sister")
- Observations about the subject's demeanor or emotional state
- Things that contradict what was said in a prior session

The biographer's brain acts as a **fuzzy index** — they remember *that* something important was said and roughly *where* in the conversation, not the exact words. They trust the recording for precision. This is a crucial insight: the within-interview memory system doesn't need to be comprehensive or precise. It needs to be lightweight enough that it doesn't interfere with the primary job of having a great conversation.

**Key interviewing techniques that map to Telltale's AI:**
- **Strategic silence.** The human need to fill silence draws out deeper responses. Caro's most important discovery about interviewing.
- **"Tell me more" + sensory detail prompts.** "What did that look like?" "What were you wearing?" These anchor abstract memories in concrete experience.
- **The inverted pyramid.** Start broad ("Tell me about your childhood"), then probe for specifics. Layered follow-up naturally draws out richer material.
- **Letting tangents run (selectively).** Tangents often contain the most valuable unexpected material. The skill is knowing when to follow one vs. redirect.
- **Asking the same question across multiple sessions.** Caro interviewed LBJ's speechwriter 22 times. "What he's telling you about something in the first interview isn't what he's telling you about that same thing in the 10th interview." Trust builds over time; stories evolve.

**What this means for Telltale:** The current system might be doing too much work inline. Extracting 3-6 structured insights per message while simultaneously trying to be a great interviewer is like a biographer frantically filing index cards while their subject is mid-sentence. The interview should be optimized for conversation quality first, with memory as a lightweight background concern.

### How a Biographer Handles Job 2: Between Interviews

This is where the real intelligence work happens, and it is inherently **async** — it happens after the interview ends, not during it.

**The between-session review cycle:**
1. Listen back to the recording (same day if possible)
2. Create a time-coded log/index: timestamp + brief description of what was discussed in each segment
3. Write field notes: both descriptive (what happened) and reflective (what you think it means, what surprised you)
4. Identify gaps: topics not yet covered, stories that felt incomplete, claims resting on a single source
5. Flag contradictions: cross-reference against prior sessions and documentary evidence
6. Update the interview guide for the next session with new questions, follow-ups, and areas to revisit
7. Research any new threads that emerged (a name mentioned, an event referenced)

**Preparation for the next interview is curated, not exhaustive.** The biographer doesn't walk in with a binder containing everything from all prior sessions. They prepare a targeted briefing: key threads to follow up, specific contradictions to probe gently, gaps to fill, new questions based on what they've learned. The prep sheet for interview #5 might reference specific moments from interviews #1-4, but it's selective — focused on what's relevant to *this* session's goals.

Robert Caro's concentric circles strategy is also relevant: he starts with peripheral figures (who talk more freely) and works inward toward the closest associates. Each ring of interviews builds knowledge and credibility that informs the next. The same principle applies to topics within a life story — early interviews cover comfortable territory (childhood, family), later ones go deeper into harder material.

**What this means for Telltale:** The between-interview processing is the highest-leverage place to build intelligence. An async pipeline that runs after each interview — indexing, summarizing, identifying gaps, preparing a briefing for the next session — mirrors exactly what a professional biographer does. The "cross-interview injection" question isn't "inject all insights from prior interviews." It's "prepare a curated briefing that helps the interviewer pick up the right threads."

### How a Biographer Handles Job 3: Assembling the Book

This is a completely separate phase with its own tools, processes, and thinking mode. No biographer sits down with raw transcripts and starts writing.

**The assembly workflow:**
1. **Distill the thesis.** Caro summarizes the point of his book in 1-3 paragraphs. Every chapter must serve this central argument.
2. **Create a structural outline.** A macro outline of the entire book, then separate outlines per chapter — describing each chapter in brief, without supportive evidence.
3. **Build "ur-documents."** Stacy Schiff creates a 100-page dossier per chapter, consolidating notes from multiple interviews and sources into a single reference document. Caro uses chapter notebooks containing all supporting material for that chapter.
4. **Map evidence to structure.** A second, detailed outline incorporates all research, linking specific interview segments and documents to each structural point.
5. **Write from the curated dossiers.** The material has already been organized and filtered. Writing is turning organized research into prose, not searching through raw material.

**Filing systems biographers use:**
- Caro: labeled physical files filling a room, a 22-foot cork board with the pinned outline, chapter notebooks
- Schiff: 100-page "ur-documents" per chapter, organized so notes remain comprehensible years later
- Bowman: digital folders + D-ring binders organized chronologically with sub-topic categories + a "Book Bible" (master Word document with auto-generated table of contents)
- Index card approach (various): one fact per card, color-coded by subject, stored in filing boxes by category, physically rearrangeable to experiment with structure

**Oral history indexing systems:**
- **OHMS (Oral History Metadata Synchronizer):** Segments interviews into 3-5 minute timecoded chunks, each with title, synopsis, and keywords. Enables keyword search that takes you to the exact moment a topic appears.
- **StoryCorps keyword system:** Fixed vocabulary categories (Beliefs, Community, Education, Emotions — ~100+ terms) plus ad-hoc fields for names, places, and general keywords. Handles 70,000+ interviews at scale.
- **Dual vocabulary approach:** Formal controlled terms alongside colloquial language — bridging archival standards with how people actually talk about their lives.

**The cutting discipline:** The ratio of research gathered to material used is enormous. The biographer's hardest skill is knowing what the book is *about* and ruthlessly cutting everything that doesn't serve that thesis — no matter how interesting it is.

**What this means for Telltale:** The book assembly phase needs completely different tooling than the interview phase. It needs a corpus-level index (who, what, when, where, themes, gaps), a structural outlining tool, and a way to navigate from outline points to the specific interview moments that support them. This confirms that Job 3 should be built as a separate system, not bolted onto the interviewing infrastructure.

### What the Biographer Analogy Reveals About Our Architecture

The biographer's workflow maps cleanly to a three-phase architecture:

| Phase | Biographer | Telltale Equivalent |
|---|---|---|
| **During interview** | Minimal notes, focused on listening. Fuzzy mental index. Trust the recording. | Lightweight inline memory — just enough for conversational coherence. Don't overload the interviewer with extraction work. |
| **Between interviews** | Listen back, index, identify gaps, flag contradictions, prepare curated briefing for next session. | Async post-interview pipeline: summarize, extract structured data, build a curated context package for the next interview. |
| **Assembling the book** | Thesis → outline → ur-documents → write. Work from curated dossiers, not raw transcripts. | Separate analysis/synthesis system: coverage maps, relationship graphs, timeline, structural outlining, segment-level retrieval. |

The critical insight: **the biographer does not do the same cognitive work in all three phases.** In-interview thinking is improvisational and present-focused. Between-interview thinking is analytical and retrospective. Book-assembly thinking is structural and editorial. Trying to make one system serve all three modes is like asking a biographer to simultaneously listen to their subject, index their filing cabinet, and outline chapter 7.

This suggests the current approach of extracting structured insights inline during conversation may be asking the AI to do too much at once — and the scaling problems we're seeing (3-6 insights per message, 1,800-24,000 total) are a symptom of that. A biographer takes maybe 5-10 margin notes per hour-long interview, then does the real processing afterward.

**One more thing the biographer analogy surfaces:** contradictions are features, not bugs. Professional oral historians treat inconsistencies as interpretively significant data. When a subject says something in interview 30 that conflicts with interview 5, that's valuable — it reveals how memory works, what the subject is protecting, or how their understanding has evolved. A memory system that silently "resolves" contradictions by overwriting old facts would destroy this signal. Telltale's system should preserve both versions with temporal context, closer to Graphiti's bi-temporal model than Mem0's UPDATE-in-place approach.

## Where This Leaves Us

The original question — "should insights evolve to serve all three jobs?" — now looks too narrow. The real question is what memory architecture Telltale needs, and insights are just one possible implementation of it.

The biographer analogy clarifies the shape of the answer: three distinct phases of thinking, each with different tools and concerns, connected by a good filing system.

**What seems clear:**
- Jobs 1 & 2 (interviewer memory + cross-interview continuity) are about bounding and surfacing the right context at the right time. The current "accumulate flat insights and inject all of them" approach won't scale.
- Job 3 (book creation index) is a corpus-level problem that should be solved separately, likely as an async post-interview pipeline.
- The temporal dimension (people, relationships, and events evolving across decades) is central to Telltale's domain and most memory systems don't handle it well.
- Async processing at interview boundaries is a natural fit for the product model — and it's exactly what real biographers do.
- The biographer analogy suggests we may be doing too much inline extraction during conversation. The interview should be optimized for conversation quality, with heavier analysis happening between sessions.
- Contradictions should be preserved as data, not silently resolved.

**What's still unresolved:**
- None of the industry approaches feel like a perfect fit on their own. The temporal knowledge graph (Graphiti) has the strongest domain alignment but is the most complex and expensive. Recursive summarization is simplest but lossiest. The hybrid retrieval approach (Mem0) has concerning accuracy numbers for a product where factual precision matters.
- The cost/latency tradeoff is real. 6-12 LLM calls per message (Graphiti) or 12.5x cost multiplier (Mem0) may not be justifiable for the product. A simpler approach that's good enough might beat a sophisticated one that's expensive and fragile.
- It's unclear where the right line is between "extract structure during the interview" and "extract structure after the interview." The biographer analogy and the async reflection pattern both suggest doing less inline and more in the background, but some inline awareness (names, relationships) is clearly valuable for interview quality. The question is how minimal that inline piece can be.
- The "curated briefing" model for cross-interview continuity (prepare a targeted context package for the next interview, not inject everything) is compelling but raises its own questions: who/what curates? How do you decide what's relevant to interview #5's topic?

This is a hard problem to solve in a way that works just right for users. More thinking needed before committing to an architecture.

## Open Questions

1. **Cross-interview injection scope:** When starting interview #5, do we inject ALL insights from the book, or just the most relevant/recent ones? At scale (20+ interviews), injecting everything could overwhelm the context window.

2. **User curation:** Should users be able to edit/delete/add insights? Or should insights stay AI-only and user control happens at the book-creation layer?

3. **Theme taxonomy:** Free-text themes are flexible but hard to aggregate. Should we define a base set of themes (family, career, identity, relationships, adversity, joy, loss, values) while allowing custom additions?

4. **When does analysis happen?** After every interview? On-demand when user opens a "coverage" view? Both?

5. **What's the right cost/accuracy tradeoff?** Full temporal knowledge graphs (6-12 LLM calls per message) vs. smarter summarization (1 LLM call) vs. something in between. How much are we willing to spend per interview turn to get better memory?

6. **Inline vs. async extraction:** How much structure should be extracted during the conversation (where it can improve interview quality but adds latency and prompt complexity) vs. after the conversation ends (where it can see the full session but can't influence the interview)?

## Original Analysis (Preserved)

The sections below were the original strategic analysis before the industry research above. Some of the recommendations may need revision based on what we've learned, but the analysis of current insight types and their gaps remains valid.

### The Core Strategic Question

> Should insights evolve to serve all three jobs, or should a separate "analysis" layer be built on top?

#### Option A: Evolve Insights

Add metadata to existing insights (theme tags, temporal era, significance score) and use them directly as the book creation index.

**Pros:**
- Infrastructure already exists — DB, repo, context injection, tRPC endpoints
- Inline extraction is efficient (one LLM call)
- No new system to build and maintain
- Insights already capture what matters during conversation

**Cons:**
- Mixes two cognitive modes: turn-level observation vs. corpus-level analysis
- Overloads the interviewer prompt (already 55 lines) with biographer concerns
- Turn-level extraction can't see cross-interview patterns
- Risk: trying to serve two masters degrades both interview quality and analytical quality

#### Option B: Insights Stay Focused + Separate Analysis Layer

Insights remain the interviewer's working memory (Jobs 1 & 2). A separate, asynchronous process consumes insights + raw transcripts to produce higher-level structures: theme maps, coverage assessments, narrative arc proposals.

**Pros:**
- Clean separation of concerns — interviewer stays focused on conversation quality
- Analysis can see the entire corpus, not just one turn
- Can run asynchronously (after interview, in background) without slowing conversation
- Analysis layer can be sophisticated (embeddings, clustering, LLM-powered synthesis) without complicating the interview path
- Aligns with the story-creation-flow phases (Phase 2: Analysis & Tagging is explicitly a post-interview step)

**Cons:**
- New system to build
- Insights become an intermediate artifact, not the final structured layer
- Duplication risk if analysis re-discovers what insights already captured

#### Option C: Hybrid — Insights Get Richer, Analysis Layer Synthesizes

Insights get modest additions (a `theme` or `era` field) that make them more useful downstream, but the heavy analytical work (coverage mapping, arc detection, significance scoring) happens in a separate layer that reads insights as input.

**Pros:**
- Captures low-hanging fruit during conversation (temporal era, basic theme) without overloading the prompt
- Analysis layer has structured inputs to work with, not just raw text
- Incremental — can ship cross-interview continuity and richer insights now, analysis layer later
- Insights serve as the "field notes" that feed into "editorial analysis" — a natural division

**Cons:**
- Middle ground risks being neither simple nor complete
- Still need to decide where the line is between "insight enrichment" and "analysis"

#### Original Recommendation: Option C (Hybrid)

> **Note:** This recommendation predates the scaling analysis and industry research above. It may need revision — particularly the assumption that accumulating insights and injecting them all is viable at scale.

Here's why, mapped to the product timeline:

**Now (Phase 1 enhancements):**
1. Wire cross-interview insight injection (Job 2) — biggest bang for zero new architecture
2. Add `explored` tracking so the AI marks threads it has thoroughly discussed
3. Add basic pruning — consolidate/deduplicate insights when they exceed a threshold

**Soon (Pre-book-creation):**
4. Enrich insight extraction with lightweight metadata the interviewer naturally notices:
   - `era`: rough temporal placement ("childhood", "1990s", "early career") — the interviewer already knows this from context
   - `theme`: broad category ("family", "career", "identity", "adversity") — low cognitive load to classify
5. Surface insights to users — let them see, curate, and correct what the AI noticed

**Later (Book creation phase):**
6. Build the analysis layer that reads insights + transcripts to produce:
   - Coverage map (which life areas are deep vs. thin)
   - Character relationship graph (from ENTITY insights)
   - Narrative arc candidates (from EVENT + EMOTION insights)
   - Gap identification ("you haven't discussed your 30s" or "Maria appears in 4 interviews but we never learned about the falling out")

### How Enriched Insights Feed the Biography Pipeline

Mapping to the synthesis pipeline from `raw-interviews-to-biography.md`:

| Pipeline Phase | How Insights Help |
|---|---|
| **Semantic Indexing** | ENTITY + era + theme = structured tags that complement vector embeddings. Query "all insights about family from the 1970s" instead of semantic search alone. |
| **Arc Selection** | EMOTION insights with temporal ordering reveal the emotional trajectory. EVENT insights with significance hints reveal turning points. |
| **Context Injection** | EVENT insights with era metadata tell us when to inject historical context ("mentioned buying a house — era: late 1970s" triggers inflation/mortgage context). |
| **Bridge Building** | DETAIL insights that span interviews reveal connections. Two ENTITY insights referencing the same person in different eras = potential bridge. |
| **Voice Calibration** | Not insight-driven — this comes from the raw transcripts themselves. |

### What Changes in the Insight Schema

Minimal additions to support the hybrid approach:

```
Current:  id, bookId, interviewId, type, content, explored, timestamps
Add:      era (nullable string), theme (nullable string)
```

- `era` — free-text temporal anchor. Examples: "childhood", "1978", "college years", "early 30s". The interviewer already knows this from conversation context.
- `theme` — broad thematic category. Examples: "family", "career", "identity", "loss", "resilience". Keep the set open (free-text, not enum) to avoid forcing the AI into a rigid taxonomy.
- `explored` — already exists, just needs to be wired up.

### The `explored` Field Strategy

Currently dead code. Two options for making it useful:

**Option A: AI self-marks during conversation.** When the AI has thoroughly discussed a DETAIL insight, it marks it explored. This means adding an `updatedInsights` field to the response JSON.

**Option B: Coverage is inferred, not tracked per-insight.** The analysis layer (later) determines coverage by looking at what insights exist, how deep the transcripts go on each topic, and what's missing. `explored` becomes irrelevant.

Leaning toward **Option B** — coverage is a corpus-level question, not a per-turn question. The AI is already doing a lot inline; asking it to also track which previous insights are "done" adds complexity to the prompt and response format. The analysis layer can do this better with full corpus visibility.

## Files Involved

**Current implementation:**
- `src/domain/insight.ts` — domain types
- `src/repositories/insight.repository.ts` — DB operations
- `src/services/context.service.ts` — insight injection into context window
- `src/services/conversation.service.ts` — insight extraction + persistence
- `src/services/response-parser.ts` — JSON parsing with retry
- `src/prompts/interviewer.ts` — system prompt with insight instructions
- `src/server/routers/interview.ts` — tRPC endpoints (unused by frontend)
- `prisma/schema.prisma` — Insight model + InsightType enum

**Key docs:**
- `docs/ideas/insights-system-analysis.md` — current state analysis
- `docs/ideas/insights-as-biographer-notes.md` — biographer vision
- `docs/ideas/raw-interviews-to-biography.md` — synthesis pipeline
- `docs/ideas/story-creation-flow.md` — end-to-end product flow
- `docs/ideas/story-flow-critique.md` — critique + alternatives
- `docs/decisions/014-insight-extraction-strategy.md` — inline extraction ADR
- `docs/decisions/018-insight-context-placement.md` — placement ADR

**Industry references:**
- [MemGPT paper (arXiv:2310.08560)](https://arxiv.org/abs/2310.08560) — OS-inspired tiered memory
- [Letta docs](https://docs.letta.com/concepts/memgpt/) — productionized MemGPT
- [Mem0 paper (arXiv:2504.19413)](https://arxiv.org/abs/2504.19413) — hybrid retrieval memory
- [Zep/Graphiti paper (arXiv:2501.13956)](https://arxiv.org/abs/2501.13956) — temporal knowledge graph
- [Graphiti GitHub (Apache-2.0)](https://github.com/getzep/graphiti) — open source implementation
- [Recursive summarization paper (Neurocomputing 2025)](https://arxiv.org/abs/2308.15022) — long-term dialogue memory
- [LangMem conceptual guide](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/) — memory patterns
- [Sleep-time compute paper](https://arxiv.org/abs/2504.13171) — async background processing
- [EMem: Event-centric memory (arXiv:2511.17208)](https://arxiv.org/abs/2511.17208) — non-compressive alternative to summarization
