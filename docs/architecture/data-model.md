# Data Model

## Entity Relationships

```
User
└── Book (the final deliverable)
    └── Story (one per topic/chapter)
        └── StorySession (a conversation session)
            ├── Message (the raw back-and-forth)
            └── StoryThread (extracted topics to follow up on)
```

## Key Separations

**StorySession vs. Story** — A StorySession is the raw conversation. A Story is the polished narrative. The synthesis step bridges the two. Multiple sessions can contribute to a single story.

**Message vs. StoryThread** — Messages are the literal back-and-forth. Threads are extracted metadata (named entities, unexplored details, emotional moments) that power follow-up questions within a session and re-engagement between sessions.

## Models

### User
Standard Auth.js user model. Owns Books. Related to Account and Session models for auth.

### Book
The final deliverable — a collection of stories compiled for print/digital export. Has a status lifecycle: `IN_PROGRESS` → `COMPLETE` → `ARCHIVED`.

### Story
One story per topic/chapter. Tracks the topic, an optional title, the final synthesized prose (`finalProse`), and display order (`orderIndex`). Status lifecycle: `NOT_STARTED` → `IN_PROGRESS` → `NEEDS_REVIEW` → `COMPLETE`.

### StorySession
A single conversation session within a story. Contains messages and extracted threads. Tracks a `depthScore` (how rich/detailed the conversation was). Status: `ACTIVE` → `PAUSED` → `COMPLETE`.

### Message
Individual message in a conversation. Has a `role` (USER, ASSISTANT, SYSTEM) and optional `audioUrl` for voice recordings (Phase 2).

### StoryThread
Extracted metadata from conversations. Types:
- **ENTITY** — person, place, thing (e.g., "sister Maria", "farm in Calabria")
- **EVENT** — something that happened
- **EMOTION** — emotional moment worth revisiting
- **DETAIL** — unexplored detail mentioned but not elaborated on

Tracks whether the thread has been `explored` in follow-up questions.

## Auth.js Models

Account, Session, and VerificationToken models follow the standard Auth.js/Prisma adapter schema. These are managed by the auth framework.
