# Idea: Depth Score

**Status:** Deferred — revisit when building AI prompting (Plan 1.2+)

## Concept

A metric on Interview that measures the richness and depth of a conversation. Used to signal when an interview has "enough" material to generate good stories, or when the AI should probe deeper.

## Possible Approaches

### Option A: Composite Quality Metric
A score (0–100) calculated by the AI after each exchange, based on:
- Specificity of details given (names, dates, places vs. vague references)
- Emotional depth (surface-level vs. deeply personal)
- Number of new entities/events mentioned
- Length and richness of user responses
- Narrative completeness (does the story have a beginning, middle, end?)

### Option B: Coverage Counter
How many extracted Insights have been explored vs. left on the table. More of a completeness metric than a quality one. Simple to compute — `explored insights / total insights`.

### Option C: Hybrid
Combine both — a quality score from the AI plus a coverage ratio. Weight them to produce a single number.

## Open Questions

- What threshold means "enough material"? This likely varies by question/topic.
- Should it influence the AI's behavior in real-time (e.g., "you're at 80%, consider wrapping up") or just be a post-hoc metric?
- Is a single number sufficient, or do we need a breakdown (emotional depth: 7/10, detail richness: 4/10)?
- How do we validate the score correlates with actual story quality?

## Decision

Deferred. Add the column as a nullable float on Interview when we're ready. The right approach will be clearer once we see real conversations and can evaluate what signals matter.
