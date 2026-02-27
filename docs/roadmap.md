# Telltale — Project Roadmap

> This roadmap is informed by the [Biography Reverse Chain](notes/biography-reverse-chain.md) analysis, which maps the full data pipeline from raw interviews to finished biography. Stage references (Stage 0–7) refer to that document.

## Phase 0: Foundation ✅
Get the project scaffolded, deployed, and talking to a database. Nothing user-facing yet — just the skeleton that everything else builds on.

- Next.js project setup with TypeScript strict mode
- Prisma schema + Neon database provisioned and migrated
- Better Auth configured (Google OAuth)
- tRPC wired up with a health-check endpoint
- Project structure established (services/, repositories/, domain/, lib/)
- Testing infrastructure (Vitest, React Testing Library, Playwright)
- Deploy to Vercel with CI on push to main
- Basic seed script for development data

**Done when:** You can sign in, hit an authenticated tRPC endpoint, and see a database query return data. Tests run and pass. App is live on a Vercel URL.

---

## Phase 1: The Conversation Engine (Core IP) ✅
Get a single conversation working end-to-end before building any surrounding UI. This is the foundation — but it will be revisited in Phase 2 as the interview model matures.

- Claude API integration with streaming responses
- System prompt for the AI interviewer
- Conversation session management (create, continue, complete)
- Message persistence (save user + assistant messages)
- Insight extraction — interviewer produces structured "mental notes" inline with each response
- Context window management (summarize older messages, keep recent ones verbatim)
- Basic chat UI — functional, not polished. Text input, streaming message display.

**Done when:** You can have a multi-turn conversation about a life topic, the AI asks meaningful follow-up questions, and the full transcript is persisted.

---

## Phase 2: Interview Intelligence ← **Next**
Revisit the interview engine to support cross-interview memory and the full data pipeline. The reverse chain analysis revealed that the interview (Stage 1) needs to produce a **core memory block** — a persistent, evolving mental model of the subject — and that an **onboarding conversation** (Stage 0) should bootstrap it before the first real interview. This phase also builds the async processing pipeline (Stage 2) that turns raw transcripts into structured intelligence.

### 2a: Core Memory Block + Cross-Interview Memory (Stage 1 revisit) ✅
Replace the current per-message insight extraction with a core memory block that lives on the Book and persists across interviews. Each interview starts knowing what prior interviews covered.

- Core memory block on Book — ~2-5k characters, updated in-place each turn
- LLM returns conversational response + updated memory block together
- Memory block contains: key people, current era, active threads, emotional landscape, brief narrative
- Cross-interview continuity — the AI starts each interview with accumulated context
- Curated briefing injection at interview start (initially manual/simple, later from Stage 2 pipeline)

### 2b: Onboarding + Interview Planning (Stage 0)
Before any interviews happen, a short intake conversation learns enough about the subject to plan intelligently. Not a form — a conversation.

- Onboarding conversation mode — distinct from interviews, more structured, clear "done" state
- Initial core memory block bootstrapped from onboarding (interview #1 already knows the subject)
- Interview plan generation — 8-15 suggested topics ordered from broad to focused
- Interview plan as a living document — evolves after each interview via Stage 2 feedback
- Subject's own priorities captured — what *they* want the book to be about

### 2c: Post-Interview Processing Pipeline (Stage 2)
The async pipeline that runs after each interview ends. This is the biographer listening back to the tape, making their index, writing field notes. Powered by Inngest (ADR 020).

- Segment indexing — break each interview into topical segments with metadata (era, people, emotional intensity)
- Entity/relationship extraction with temporal context ("Maria: sister, close in childhood, estranged 1992-2005")
- Knowledge graph accumulation — entities and relationships grow across interviews
- Interview summary — 1-2 page narrative field notes per session
- Thread/gap identification — what opened, what deepened, what contradicted prior sessions
- Curated briefing generation for the next interview — top follow-up threads, contradictions to probe, coverage gaps

**Done when:** Interviews build on each other. The AI remembers prior sessions via the core memory block. After each interview, background processing extracts structured data. The system suggests what to explore next based on accumulated intelligence.

---

## Phase 3: Corpus Analysis (Stage 3)
The analytical layer between raw interview material and book-level decisions. Some of this accumulates continuously via Phase 2's knowledge graph; the rest requires periodic cross-interview synthesis.

- Theme identification across all interviews — what patterns recur?
- Timeline/chronology assembly — major events placed in order, life periods identified
- Coverage map — which life periods are deeply explored vs. barely touched
- Emotional peak identification — the moments of highest intensity across all interviews
- Arc and pivot identification — what changed the trajectory? What does the subject think their life is about?
- Contradiction and evolution tracking — where the subject told different versions, where perspectives shifted

**Done when:** After 10+ interviews, the system can produce a structured synthesis of the full life story: themes, timeline, pivots, coverage gaps, emotional landmarks.

---

## Phase 4: Book Creation (Stages 4–7)
The "book creation" product — a distinct feature set that consumes the interview corpus and knowledge graph to produce a biography. Four sub-phases, each building on the last.

### 4a: Macro Structure (Stage 4)
Collaborative book planning. The system proposes structural approaches; the user refines.

- 2-3 structural proposals (chronological, thematic, pivotal moments, hybrid)
- Editorial thesis generation — what is this book *about*?
- Chapter plan with descriptions, themes, and rationale
- Iterative refinement — system proposes, user adjusts, system revises

### 4b: Chapter Dossiers (Stage 5)
The biographer's research files — organized source material per chapter, not prose yet.

- Map chapters to relevant transcript segments via knowledge graph queries
- Key quote extraction — the 10-20 strongest direct quotes per chapter
- Supporting facts, dates, names, entity/relationship context
- Chapter readiness assessment — rich material vs. thin, flagging gaps that might need another interview

### 4c: Rough Draft (Stage 6)
Turn organized research into narrative prose. The most LLM-intensive stage.

- Voice profile extraction — analyze the subject's speech patterns across all transcripts
- Per-chapter prose generation from dossier + voice guide + editorial thesis
- Source attribution — link passages back to transcript segments for traceability
- User review and revision loop per chapter

### 4d: Polish (Stage 7)
From rough manuscript to finished biography.

- Full-manuscript consistency pass — voice, facts, pacing across chapters
- Voice calibration — does each chapter sound like the subject?
- User-directed revisions
- Export — formatted PDF, EPUB, print-ready

**Done when:** The system can take a corpus of interviews and produce a polished, book-length biography with the subject's authentic voice.

---

## Phase 5: Voice Input
The accessibility unlock. Users talk instead of type.

- Microphone capture in the browser (MediaRecorder API)
- Streaming audio to Deepgram/AssemblyAI for real-time transcription
- Transcribed text feeds into the existing conversation engine
- Per-user name/place glossary for transcription accuracy
- Audio file storage in Cloudflare R2, linked to messages
- Push-to-talk and/or VAD-based pause detection

**Done when:** A user can tap a mic button, speak their story, see their words appear as text, and have the AI respond with follow-up questions — all within the existing conversation flow.

---

## Phase 6: Polish & Launch Prep
Make it feel like a product, not a prototype.

- Landing page — what Telltale is, how it works, pricing
- Responsive design pass — mobile-first (this is a couch/walking activity)
- Error handling, loading states, empty states
- Stripe integration for subscriptions
- Email system — welcome emails, weekly topic prompts, re-engagement nudges based on unexplored threads
- Observability — Axiom (structured logs), Sentry (error tracking), Better Stack (uptime monitoring)
- Product analytics — PostHog for user behavior tracking (session length, completion rate, synthesis approval rate)

**Done when:** You'd feel comfortable sharing the URL with strangers and charging money.

---

## Phase 7: Voice Output & Full Conversation Mode
The "wow" feature. Turn the experience into a spoken dialogue.

- TTS integration (ElevenLabs/Cartesia) for AI responses
- "Listen mode" toggle — AI reads its follow-up questions aloud
- Full voice conversation mode — speak and listen, no screen required
- Latency optimization across the STT → Claude → TTS pipeline
- Longer silence thresholds for storytelling pauses vs. "I'm done" pauses

**Done when:** A user can have a hands-free spoken conversation with the AI interviewer and produce a story from it.

---

## Phase 8: Growth & Retention
Features that drive word-of-mouth and keep users coming back.

- Gift flow — buy Telltale for someone else (this is the primary purchase model)
- Audio archive — QR codes in printed books linking to audio clips of the storyteller
- Sharing — individual stories shareable via link
- Multi-book support — one user can create multiple books (different family members, different themes)
- Topic suggestions powered by previous conversations ("You mentioned your time in the Navy — want to tell that story?")
- Collaborative books — multiple family members contribute stories to the same book

---

## What to Build Next

**Phases 0–1 are complete.** The foundation is solid and the basic conversation engine works end-to-end.

**Phase 2 is next** — and it's the most important phase. It upgrades the interview engine from isolated conversations to a system that accumulates intelligence across sessions. The three sub-phases (2a → 2b → 2c) build on each other: core memory block first, then onboarding to bootstrap it, then the async pipeline to feed it.

**Phases 3–4 are the book product.** They consume the structured data Phase 2 produces. We don't need to build them now, but Phase 2's data pipeline must produce what they'll eventually need.

**Phase 5 (voice) is the differentiator** that makes this more than a StoryWorth clone. It can slot in alongside or after Phase 3 — it's independent of the book pipeline.

**Phases 6+ are post-launch iteration.**
