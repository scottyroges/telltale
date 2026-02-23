# Interview UI Alternatives

**Status:** Exploration / Not Implemented
**Created:** 2026-02-22

## Overview

The current interview interface uses a traditional chatbot pattern: messages scroll in a conversation view, user types responses in a small text box. While functional, this may not be the optimal UX for capturing life stories.

These alternatives explore different interaction patterns that better support the primary activity: **writing detailed, rich stories**.

---

## Alternative 1: Word Processor-Focused Interface

### Concept

Flip the traditional chat interface - make the text box the hero, not the conversation history. The user experience should feel like **writing in a word processor**, not chatting with a bot.

### Layout

```
┌─────────────────────────────────────────┐
│ Header / Navigation                      │
├─────────────────────────────────────────┤
│                                         │
│  Most Recent AI Question/Prompt         │
│  (Highlighted, always visible)          │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │                                   │ │
│  │  Large Text Editor Area           │ │
│  │  (Main focus, most screen space)  │ │
│  │                                   │ │
│  │  User types their story here...   │ │
│  │                                   │ │
│  │                                   │ │
│  │                                   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Send Response]  [View Full Transcript]│
│                                         │
└─────────────────────────────────────────┘
```

### Key Features

- **Large, prominent text editor** occupies 60-70% of screen space
- **Only the most recent AI question** shown at top (not full conversation)
- Full transcript available via expandable panel or separate view
- Text editor features:
  - Comfortable font size and line height for extended writing
  - Markdown support (bold, italics, lists)
  - Auto-save drafts
  - Word/character count
  - Rich text toolbar (optional)
- Feels like writing a journal entry or essay, not chatting

### Benefits

- **Reduces cognitive load** - user focuses on writing, not scrolling conversation
- **Encourages longer, more thoughtful responses** - large text area invites more writing
- **Less "chatbot" feel** - feels more like creative writing or journaling
- **Better for deep stories** - optimized for the primary use case (writing detailed narratives)

### Drawbacks

- May lose conversational flow context
- Users might want to reference earlier AI questions
- Requires good "most recent prompt" summarization if conversation has multiple threads

### Implementation Considerations

- Could toggle between "writing mode" (this view) and "conversation mode" (traditional chat)
- Transcript viewer could be a sidebar or modal
- Consider rich text editor libraries: Lexical, Tiptap, or simpler textarea with formatting toolbar
- Auto-save to prevent lost work

---

## Alternative 2: Inline Comment/Annotation Interface

### Concept

User writes their full answer to the question in their own words, as a continuous narrative. When they pause, the AI reads what they've written and **adds inline comments** suggesting areas to expand, deepen, or clarify - like a writing coach or editor.

### Layout

```
┌─────────────────────────────────────────┐
│ Header / Navigation                      │
├─────────────────────────────────────────┤
│ Question: Tell me about your first car   │
├─────────────────────────────────────────┤
│                                         │
│  I got my first car when I was 17.      │
│  It was a 1995 Honda Civic that my      │ ┌─────────────────────┐
│  dad helped me buy. I remember being    │ │ 💭 What color was   │
│  so excited to finally have my own      │ │ it? Describe how it │
│  transportation.                        │ │ looked.             │
│                                         │ └─────────────────────┘
│                                         │
│  The first time I drove it alone, I     │
│  felt so free and independent. I drove  │ ┌─────────────────────┐
│  to my friend's house and we went to    │ │ 💬 Expand on this   │
│  the beach.                             │ │ feeling. What did   │
│                                         │ │ "free" mean to you  │
│  [Continue writing...]                  │ │ in that moment?     │
│                                         │ └─────────────────────┘
│                                         │
└─────────────────────────────────────────┘
```

### How It Works

1. **User writes their answer** in their own words, continuously, like a journal entry
2. **AI monitors for pauses** (e.g., 10-15 seconds of no typing, or user clicks "Get Feedback")
3. **AI analyzes the text** and adds inline comments/annotations:
   - "Expand on this - what were you feeling?"
   - "Describe this in more detail - what did it look like?"
   - "You mentioned this - can you tell me more about why that mattered?"
4. **User addresses comments** by editing their text inline
5. **Comments can be resolved** once user has expanded that section
6. **Cycle repeats** until user feels the story is complete

### Comment Types

- **Expansion prompts**: "Tell me more about X"
- **Emotional depth**: "What were you feeling in that moment?"
- **Sensory details**: "Describe what you saw/heard/smelled"
- **Context questions**: "Why was this important to you?"
- **Connection prompts**: "How did this relate to X you mentioned earlier?"
- **Positive reinforcement**: "This is a beautiful detail!"

### Benefits

- **User maintains ownership** - story stays in their words, AI is just a coach
- **Natural writing flow** - write continuously, not waiting for AI prompts
- **Focused feedback** - AI targets specific areas needing depth
- **Less pressure** - no need to respond to AI immediately, can write at own pace
- **Better narrative structure** - user controls the story arc, AI helps enrich it

### Drawbacks

- More complex UI implementation (inline comments/annotations)
- May be unclear when to "pause" for AI feedback
- Could interrupt writing flow if comments appear too frequently
- Requires sophisticated AI prompting to give useful, targeted feedback

### Implementation Considerations

- Use a collaborative editing interface similar to Google Docs comments
- Libraries: ProseMirror, Tiptap, Quill (all support comments/annotations)
- AI trigger options:
  - Manual: User clicks "Get Feedback" button
  - Automatic: After X seconds of inactivity
  - Hybrid: Subtle indicator that AI has feedback, user clicks to view
- Comment resolution workflow
- Need to store both the user's text and the AI comments in the data model
- Consider: Does resolved comment history get saved? (Probably yes, for analysis)

---

## Comparison to Current Interface

| Aspect | Current Chat | Alt 1: Word Processor | Alt 2: Inline Comments |
|--------|-------------|---------------------|---------------------|
| Primary focus | Conversation | Writing | Writing |
| AI role | Conversational partner | Prompt provider | Writing coach |
| User control | Reactive (responds to AI) | Focused (one prompt at a time) | Proactive (writes first) |
| Text area size | Small | Large | Large |
| Writing flow | Fragmented (Q&A) | Continuous | Continuous |
| Context visibility | Full transcript | Most recent prompt | Current document |
| Best for | Quick exchanges | Focused storytelling | Long-form narratives |

---

## Recommendation

Both alternatives address the same core insight: **the current chat interface optimizes for conversation, but our goal is rich storytelling**.

### Short-term: Fix current chat issues (Phase 1 Enhancements Part 2)
- Address readability, layout, and critical bugs
- Get to a functional baseline

### Mid-term: Experiment with Alternative 1 (Word Processor)
- Easier to implement than inline comments
- Can be added as an optional "writing mode" toggle
- Tests the hypothesis that larger text area + focused prompts improve story quality
- If successful, could become the default

### Long-term: Consider Alternative 2 (Inline Comments) for Phase 3+
- More ambitious, requires significant UI work
- Could be powerful for users who want to write long-form narratives
- Consider for "deep story mode" or advanced users
- Could complement traditional chat for quick stories

---

## Next Steps

1. Complete Phase 1 Enhancements Part 2 (fix current chat UI)
2. User testing: Do people want to write longer stories? Or are short Q&A exchanges preferred?
3. Prototype Alternative 1 as an optional mode
4. Gather feedback on writing experience
5. Decide whether to iterate on Alternative 1, explore Alternative 2, or stick with improved chat

---

## Open Questions

- What do users actually want? Long-form writing or guided Q&A?
- Can we detect user preference automatically (e.g., response length patterns)?
- Should these be different modes, or different interview types?
- How do we preserve the "conversational warmth" while optimizing for writing?
- What's the right balance between AI guidance and user autonomy?
