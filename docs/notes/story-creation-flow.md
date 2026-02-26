# Idea: Story Creation Flow

**Status:** Exploration
**Created:** 2026-02-23
**Category:** Product Vision & User Experience

## Overview

End-to-end flow for transforming raw interview conversations into polished, published life story books. This represents the complete user journey from initial interviews through final book export.

## The Full Flow

### Phase 1: Interview & Collection
**Status:** Currently in development (Phase 1)

**What happens:**
- User conducts interviews on various topics (childhood, career, relationships, etc.)
- AI asks follow-up questions to draw out rich, detailed stories
- Conversations are free-form and exploratory
- User can have multiple interview sessions on different topics
- Raw message history accumulates

**Current implementation:**
- Books represent topics/themes
- Each book can have multiple interview sessions
- Messages stored chronologically
- Context window management keeps conversations focused

### Phase 2: Analysis & Tagging
**Status:** Idea / Not yet implemented

**What happens:**
- System analyzes raw messages from all interviews
- Identifies distinct stories and themes within conversations
- Tags messages by topic, story, time period, people mentioned, etc.
- Groups related messages across different interview sessions
- Example: Messages about "first day of school" scattered across 3 interviews get grouped together

**Potential approach:**
- Background analysis after each interview session
- Extract story boundaries ("this is one coherent story")
- Tag entities: people, places, time periods, themes
- Create a graph of related stories and topics
- Store tags/groupings in database for later retrieval

**UI implications:**
- "Stories discovered" view showing grouped content
- Tag browser (filter by person, place, theme)
- Visual representation of story connections
- Ability to manually adjust tags/groupings

### Phase 3: Completeness Assessment
**Status:** Idea / Not yet implemented

**What happens:**
- AI evaluates which stories are "done" vs. need more detail
- Identifies gaps: "You mentioned your grandmother, but haven't shared any specific stories about her"
- Suggests follow-up interview topics
- Gives user visibility into coverage and depth

**Metrics to track:**
- Story depth score (how much detail exists)
- Coverage map (which life areas have been explored)
- Question suggestions for incomplete areas
- Timeline completeness (gaps in chronology)

**UI implications:**
- Dashboard showing "Stories ready for book" vs. "Stories needing more detail"
- Heatmap of life coverage (childhood: 80%, career: 40%, etc.)
- Suggestions for next interview topics
- "Interview until ready" vs. "Ready to create book" states

### Phase 4: Book Structure & Outline
**Status:** Idea / Not yet implemented

**What happens:**
- User transitions from interview mode to book creation mode
- AI proposes book structure/outline based on collected stories
- Suggests chapters, sections, narrative arc
- Considers:
  - Chronological vs. thematic organization
  - Narrative flow and pacing
  - Emotional arc of the book
  - Target audience (family, public memoir, etc.)

**User control:**
- Review proposed structure
- Reorder chapters/sections
- Merge or split stories
- Set overall tone/style preferences
- Choose perspective (first person, third person)

**UI implications:**
- Outline editor with drag-and-drop
- Multiple structure templates (chronological, thematic, hybrid)
- Preview of how stories fit into structure
- "Book feel" selector (intimate family history, published memoir, etc.)

### Phase 5: Story Placement
**Status:** Idea / Not yet implemented

**What happens:**
- AI places tagged stories into the book structure
- Each chapter gets populated with relevant stories
- User reviews and provides feedback
- Stories can be moved between chapters
- Order within chapters can be adjusted

**Feedback loop:**
- User can override AI placement
- Mark stories as "don't include"
- Request different stories for a chapter
- Combine multiple story fragments into one
- Split long stories across multiple chapters

**UI implications:**
- Book editor showing chapter-by-chapter content
- Drag stories between chapters
- Mark stories as primary/supporting/excluded
- Preview chapter flow
- Word count and pacing indicators

### Phase 6: Story Generation & Refinement
**Status:** Idea / Not yet implemented

**What happens:**
- AI transforms raw interview messages into polished narrative prose
- Maintains the user's voice and authentic details
- Adds narrative structure (opening hooks, transitions, conclusions)
- Applies consistent style and tone across the book
- Enriches sparse details where appropriate

**Generation approach:**
- Start with raw messages as source material
- Preserve specific quotes, names, dates, details
- Add narrative connective tissue
- Generate chapter introductions/conclusions
- Ensure smooth transitions between stories

**User override capability:**
- User can write/rewrite any section manually
- Mix of AI-generated and user-written content
- Iterative refinement: user edits, AI adapts
- "Regenerate this section" option
- Style controls (more literary, more conversational, etc.)

**UI implications:**
- Side-by-side: raw interview excerpt → polished story
- Inline editing of generated content
- Version history for each section
- Style/tone controls per chapter or per story
- "Keep my exact words" vs. "Polish this" toggles

### Phase 7: Final Review & Export
**Status:** Idea / Not yet implemented

**What happens:**
- User reviews complete book end-to-end
- Makes final edits and adjustments
- Approves for export/publication
- Exports in desired format

**Export formats:**
- PDF for print (printer-ready)
- EPUB/MOBI for e-readers
- Web-based shareable version
- Raw manuscript (Word/Google Docs)

**Print integration:**
- Direct send to print-on-demand service (Blurb, Lulu, etc.)
- Custom cover design
- Print specifications (trim size, paper type, binding)
- Proof copy vs. final print run

**UI implications:**
- Book preview (paginated, styled like final product)
- Export format selector
- Print specifications wizard
- Order management for print copies
- Sharing controls (who can access web version)

## Key Design Principles

### 1. Progressive Disclosure
- Don't overwhelm users with the full complexity upfront
- Each phase builds naturally on the previous one
- Users can iterate: go back to interviews even after starting book creation

### 2. User Control & Override
- AI suggests, user decides
- Every automated decision can be overridden
- Mix of AI-generated and user-written content is expected
- Transparency about what's AI vs. original words

### 3. Authentic Voice Preservation
- The book should sound like the person, not like AI
- Preserve specific details, quotes, linguistic quirks
- Enhance and structure, don't rewrite personality

### 4. Flexible Structure
- Support multiple book types: chronological memoir, thematic collection, hybrid
- Not one-size-fits-all: adaptable to different storytelling styles
- Support both comprehensive life stories and focused topic books

### 5. Iterative Refinement
- Not a linear pipeline: users can go back and forth
- Add more interviews after starting book creation
- Regenerate sections with new style preferences
- Multiple drafts and versions

## Open Questions

### Story Tagging & Grouping
- How automatic vs. manual should tagging be?
- What's the right granularity for "a story"?
- How do we handle overlapping stories (same event, different perspectives)?
- Can we detect when user is telling the same story twice?

### Completeness Heuristics
- What makes a story "done enough"?
- How do we balance depth vs. breadth?
- Should we enforce minimum coverage, or let users decide?
- How do we avoid pressuring users to share more than they want?

### Narrative Generation
- How much literary enhancement is appropriate?
- What level of creative interpretation is acceptable?
- How do we handle gaps or contradictions in the source material?
- Should we generate connective tissue (e.g., transitions, context) that wasn't explicitly stated?

### Book Structure
- Do we offer templates, or generate custom structures?
- How do we handle non-linear storytelling?
- What about multiple perspectives or narrative voices?
- How do we deal with sensitive/private stories (include but mark as private)?

### User Experience Flow
- Is the phase transition explicit (click "Move to book creation") or automatic?
- Can users jump ahead and start outlining before "complete" interviews?
- How do we surface the value of each phase without making it feel like work?
- What's the minimum viable interview set to start book creation?

## Related Work

### Current Implementation (Phase 1)
- Books and interviews exist
- Conversation UI with context management
- Insight extraction (inline during conversation)
- Message storage and retrieval

### Related Ideas
- **docs/ideas/insights-as-biographer-notes.md** - Using insights as "biographer's notes" for book creation
- **docs/ideas/book-perspective.md** - First person vs. third person narrative perspective
- **docs/ideas/depth-score.md** - Measuring interview depth/completeness

### Relevant ADRs
- **ADR 006** - Claude Sonnet for AI (narrative generation will use same model)
- **ADR 013** - No streaming (book generation might want streaming for long content)
- **ADR 014** - Inline structured output (tagging/analysis might follow similar pattern)

## Phasing This Work

### Short-term (Phase 1-2)
- ✅ Complete interview UI and conversation flow
- Capture insights inline (rudimentary tagging)
- Basic "stories discovered" view (read-only)

### Medium-term (Phase 3-4)
- Story tagging and grouping
- Completeness assessment
- Book structure/outline editor
- Story placement into outline

### Long-term (Phase 5+)
- Narrative generation engine
- Iterative refinement UI
- Export formats
- Print integration

### Key Milestones
1. **Interview collection works well** (Phase 1 goal)
2. **Can identify distinct stories** (Phase 2)
3. **Can create a book outline** (Phase 3)
4. **Can generate first draft of a book** (Phase 4)
5. **Can export print-ready PDF** (Phase 5)

## Success Criteria

When this flow is complete, a user should be able to:
- [ ] Conduct natural, free-form interviews on various topics
- [ ] See their stories automatically tagged and grouped
- [ ] Understand which areas need more detail vs. are ready for book creation
- [ ] Create a book outline that reflects their story's natural structure
- [ ] Review AI-generated narrative based on their interviews
- [ ] Override or manually write any section of the book
- [ ] Export a polished, print-ready book
- [ ] Send the book directly to a print service or share digitally
- [ ] Feel confident that the book authentically represents their voice and stories

## Next Steps

1. **Validate the flow** - Share this vision with users/stakeholders
2. **Identify first target phase** - Likely Phase 2 (analysis & tagging)
3. **Create detailed plan** - Break chosen phase into actionable tasks
4. **Prototype key interactions** - UI mockups for story tagging, outline editor
5. **Research third-party integrations** - Print-on-demand APIs, export formats
6. **Consider data model changes** - Schema updates to support tagging, story boundaries, book structure

## Notes

- This represents the full vision, not necessarily the first implementation
- Each phase can ship independently and provide value
- The flow should feel natural and not like a rigid pipeline
- User agency and control are paramount at every step
- The goal is to help people create books they're proud of, not to automate away their authorship
