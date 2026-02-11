# Telltale — Project Roadmap

## Phase 0: Foundation
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

## Phase 1: The Conversation Engine (Core IP)
This is the product. Everything else is scaffolding around this. Get a single conversation working end-to-end before building any surrounding UI.

- Claude API integration with streaming responses
- System prompt for the AI interviewer — iterate heavily here
- Conversation session management (create, continue, complete)
- Message persistence (save user + assistant messages)
- Thread extraction after each user message (people, places, events, unexplored details)
- Context window management (summarize older messages, keep recent ones verbatim)
- Basic chat UI — functional, not polished. Text input, streaming message display.

**Done when:** You can have a multi-turn conversation about a life topic, the AI asks meaningful follow-up questions, and the full transcript is persisted.

---

## Phase 2: Story Lifecycle
Turn raw conversations into something presentable. This is where the product starts feeling real.

- Story synthesis pipeline (conversation transcript → first-person narrative via Claude)
- Synthesis review UI — user can read, edit, and approve the generated story
- Topic system — predefined topics + custom topics, track which are started/complete
- Story depth scoring — simple heuristic to indicate how rich a story is
- Dashboard showing all stories, their status, and suggested next topics

**Done when:** A user can pick a topic, have a conversation, get a polished story draft back, edit it, and see it marked as complete on their dashboard.

---

## Phase 3: The Book
Assemble stories into a deliverable. This is what people are paying for.

- Book model — collection of stories with ordering
- Chapter management UI — reorder stories, set chapter titles
- Book preview — read-through view of all stories in order
- PDF export — formatted, printable book with cover page and table of contents
- Basic styling/theming for the exported book

**Done when:** A user with several completed stories can arrange them into a book and download a PDF that looks good enough to print.

---

## Phase 4: Voice Input
The accessibility unlock. Users talk instead of type.

- Microphone capture in the browser (MediaRecorder API)
- Streaming audio to Deepgram/AssemblyAI for real-time transcription
- Transcribed text feeds into the existing conversation engine
- Per-user name/place glossary for transcription accuracy
- Audio file storage in Cloudflare R2, linked to messages
- Push-to-talk and/or VAD-based pause detection

**Done when:** A user can tap a mic button, speak their story, see their words appear as text, and have the AI respond with follow-up questions — all within the existing conversation flow.

---

## Phase 5: Polish & Launch Prep
Make it feel like a product, not a prototype.

- Landing page — what Telltale is, how it works, pricing
- Onboarding flow — first-time user experience, pick your first topic
- Responsive design pass — mobile-first (this is a couch/walking activity)
- Error handling, loading states, empty states
- Stripe integration for subscriptions
- Email system — welcome emails, weekly topic prompts, re-engagement nudges based on unexplored threads
- Analytics — track key metrics (session length, completion rate, synthesis approval rate)

**Done when:** You'd feel comfortable sharing the URL with strangers and charging money.

---

## Phase 6: Voice Output & Full Conversation Mode
The "wow" feature. Turn the experience into a spoken dialogue.

- TTS integration (ElevenLabs/Cartesia) for AI responses
- "Listen mode" toggle — AI reads its follow-up questions aloud
- Full voice conversation mode — speak and listen, no screen required
- Latency optimization across the STT → Claude → TTS pipeline
- Longer silence thresholds for storytelling pauses vs. "I'm done" pauses

**Done when:** A user can have a hands-free spoken conversation with the AI interviewer and produce a story from it.

---

## Phase 7: Growth & Retention
Features that drive word-of-mouth and keep users coming back.

- Gift flow — buy Telltale for someone else (this is the primary purchase model)
- Audio archive — QR codes in printed books linking to audio clips of the storyteller
- Sharing — individual stories shareable via link
- Multi-book support — one user can create multiple books (different family members, different themes)
- Topic suggestions powered by previous conversations ("You mentioned your time in the Navy — want to tell that story?")
- Collaborative books — multiple family members contribute stories to the same book

---

## What to Build First

Phases 0-2 are the MVP. If a user can sign in, have an AI-guided conversation, and get a polished story back, you have something worth testing with real people.

Phase 3 (book export) is required before charging money — it's the deliverable.

Phase 4 (voice) is the differentiator that makes this more than a StoryWorth clone.

Phases 5+ are post-launch iteration.
