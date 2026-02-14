# Data Model

## Entity Relationships

```
Question (global prompt catalog)

User
└── Book (grouping container)
    ├── BookQuestion (join: which questions are in this book)
    ├── Interview (bookId, questionId — the raw conversation)
    │   ├── Message (the back-and-forth)
    │   ├── Insight (extracted metadata for follow-ups)
    │   └── InterviewSummary (rolling summaries, linked list)
    └── Story (bookId, interviewId — polished output)
        └── StorySection (ordered chunks of generated prose)
```

## Key Separations

**Interview vs. Story** — An Interview is the raw conversation between the user and the AI interviewer. A Story is the polished narrative output. One interview can produce multiple stories — a long interview about "childhood" might yield separate stories about school, family, and neighborhood.

**Message vs. Insight** — Messages are the literal back-and-forth. Insights are extracted metadata (named entities, unexplored details, emotional moments) that power follow-up questions within an interview and re-engagement across interviews.

**InterviewSummary (linked list)** — As interviews grow long, rolling summaries keep the AI's context window manageable. Each summary incorporates the previous one plus new messages. The AI uses the latest summary + recent messages instead of replaying the full history.

**Story vs. StorySection** — LLMs can't reliably produce long-form prose in one pass. Stories are generated section by section, then assembled. StorySections provide retry granularity — regenerate one bad section without redoing the whole story.

## Models

### User
Standard Better Auth user model. Owns Books.

### Question
Global prompt catalog — hardcoded starting points that kick off interviews. Has a `category` for search and organization (e.g., "childhood", "career", "relationships"). Not user-specific — shared across all users and books.

### Book
Top-level grouping container. A user can have multiple books, each containing a set of interviews and resulting stories. Status lifecycle: `IN_PROGRESS` → `COMPLETE` → `ARCHIVED`.

### BookQuestion
Join table tracking which questions a user has selected for a given book. Provides a "checklist" UX — here are the questions in your book, here's which ones you've interviewed for, here's what's left. Status lifecycle: `NOT_STARTED` → `STARTED` → `COMPLETE`. Unique constraint on `(bookId, questionId)`.

### Interview
The raw conversation container. Started from a question within a book. Contains all messages, extracted insights, and rolling summaries. No topic field — the originating Question provides the starting point; summaries and insights capture where the conversation actually went. Status lifecycle: `ACTIVE` → `PAUSED` → `COMPLETE`.

### Message
Individual message in an interview. Has a `role` (USER, ASSISTANT, SYSTEM). Messages are append-only and immutable — no `updatedAt`.

### Insight
Extracted metadata from interview conversations. Types:
- **ENTITY** — person, place, thing (e.g., "sister Maria", "farm in Calabria")
- **EVENT** — something that happened
- **EMOTION** — emotional moment worth revisiting
- **DETAIL** — unexplored detail mentioned but not elaborated on

Tracks whether the insight has been `explored` in follow-up questions. Interview-scoped but queried across all interviews in a book for cross-interview follow-ups.

### InterviewSummary
Rolling summaries forming a linked list via `parentSummaryId`. Each summary incorporates the previous summary plus new messages. `messageCount` tracks cumulative messages covered. Append-only — no `updatedAt`.

### Story
Polished narrative output from an interview. Has a direct relationship to both Book (for ordering) and Interview (for provenance). `prose` holds the final assembled text from sections. `orderIndex` controls position in the book. Status lifecycle: `DRAFT` → `REVIEWED` → `FINAL`.

### StorySection
Ordered chunks of generated prose within a story. Each section is generated independently, allowing retry of individual sections. `orderIndex` controls assembly order. Status lifecycle: `GENERATING` → `DRAFT` → `FINAL`.

## Schema Conventions

- **Application model IDs** use `@default(cuid())` — unlike Better Auth models which use plain `String @id` with runtime-generated IDs
- **Table names** use `@@map("snake_case")` for all models
- **Foreign keys** have `@@index` for query performance and `onDelete: Cascade` on parent relations
- **InterviewSummary.parentSummaryId** has `@unique` to enforce a strict 1:1 linked list (each summary can be the parent of at most one child)
- **Message** and **InterviewSummary** have no `updatedAt` — they are append-only/immutable

## Auth Models

Account, Session, and Verification models follow the standard Better Auth/Prisma adapter schema. These models are managed by Better Auth — IDs are generated at runtime (no `@default(cuid())`), and table names are lowercased via `@@map`.
