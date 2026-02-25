# ADR 021: Interviews Independent of Catalog Questions

**Status:** Accepted
**Date:** 2026-02

## Context

Interviews were tightly coupled to the question catalog through a required `questionId` FK on the Interview model. Starting an interview required selecting a catalog question first — the flow was rigid: catalog → BookQuestion → interview.

This coupling created several problems:

- **No custom topics.** Users couldn't start interviews with their own prompts — every interview had to originate from a predefined catalog question.
- **No AI-generated follow-ups.** The system couldn't spawn interviews like "You mentioned X, let's explore that" because there was no catalog question to reference.
- **One interview per question.** A unique constraint on `(bookId, questionId)` prevented multiple interviews exploring different angles of the same topic.
- **Unnecessary status tracking.** `BookQuestionStatus` (`NOT_STARTED`, `STARTED`, `COMPLETE`) on BookQuestion duplicated state that could be derived from whether an interview existed.
- **Rigid entry points.** Any new way to start an interview (async processing, AI suggestions, user input) would need to route through the catalog.

## Decision

**Interview owns its topic as plain text.** The `questionId` FK is removed from Interview and replaced with a `topic` text field — the prompt used to start the conversation, regardless of source.

**BookQuestion optionally links to its Interview.** An `interviewId` FK on BookQuestion tracks which catalog questions have been explored. The presence of `interviewId` is the completion state — no enum needed.

**Single entry point: `startInterview(bookId, topic)`.** The caller provides the topic string; the service doesn't know or care whether it came from the catalog or custom user input. The catalog UI copies `question.prompt` into the topic field; custom input provides it directly.

**BookQuestionStatus enum removed.** The `status` column on BookQuestion is dropped along with the enum.

## Alternatives Considered

### Keep coupling with relaxed constraints

Make `questionId` nullable on Interview and allow custom topics alongside catalog-based ones. Rejected because it preserves the complexity of two paths (catalog vs. custom) in the service layer while solving only part of the problem — the status enum and BookQuestion coupling would remain.

### Dual-path approach

Separate `startFromCatalog()` and `startCustom()` service methods. Rejected because it doubles the API surface and creates divergent code paths for what is fundamentally the same operation: "start an interview with a topic."

## Consequences

### What We Get

- **Flexible entry points.** Custom topics, AI-generated follow-ups, and async processing can all start interviews through the same path.
- **Simpler data model.** Interview has no dependency on the Question model. BookQuestion is a straightforward join with an optional link.
- **Catalog becomes optional.** It's a source of topic suggestions rather than a required step.
- **Derived completion state.** No status enum to keep in sync — BookQuestion completion is determined by the presence of `interviewId`.

### What We Lose

- **Direct provenance tracking.** We can no longer query "which catalog question spawned this interview" from the Interview side. This is acceptable because BookQuestion maintains the reverse link, and the `topic` text preserves what was asked.

### Migration

The migration is partially destructive — `questionId` on Interview is dropped after backfilling `topic` from the linked Question's prompt. `BookQuestion.interviewId` is backfilled from existing Interview-Question relationships before the column is removed.
