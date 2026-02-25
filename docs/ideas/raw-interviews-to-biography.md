# From Raw Interviews to Great Biography

How do we take raw interview material and turn it into something that reads like a real biography — not just a collection of stories?

## The Problem We're Solving

Storyworth gives people questions and expects them to write. But most people aren't writers. You get out what you put in, and most people just don't have that skill.

Our AI interviewer solves the first half: it probes, follows up, pulls threads, and gets the rich raw material. But after gathering stories, life lessons, failures and triumphs — the next piece is putting it together into a strong narrative. Not a collection of stories. A biography someone will be proud of.

## What Makes a Good Biography

A bad biography is a chronological list: this happened, then this happened. A good biography is a study of cause and effect.

### The Through-Line

Great biographies have a central thesis or theme. They aren't about "everything the person did" — they're about a specific struggle or question. The system should filter events through a lens, not dump data.

### Conflict and Vulnerability

Readers disengage when a subject seems perfect. The best biographies highlight failures, bad decisions, and the messy parts. If we can help users identify their lowest points, we automatically create a more compelling arc.

### Context

A person doesn't exist in a vacuum. Good biographies place the subject within their time and place. "In 1979, buying a house was hard" becomes richer when you know inflation was at 11% and mortgage rates were climbing.

## The Synthesis Pipeline

### Phase 1: Semantic Indexing

Before writing a word, understand the shape of the data.

- **Vector embeddings** on story chunks to find connections across decades (father's strictness in 1960 links to being tough on employees in 1995 — thematic "Authority" link that keyword search would miss)
- **Auto-tagging** every story on three dimensions:
  - Timeline (date/era)
  - Entity (people involved)
  - Sentiment/Theme (regret, triumph, humor)

### Phase 2: Arc Selection

Don't just ask "what order?" — propose a narrative architecture based on the clustered tags.

**Option A: Chronological Growth** — Linear progression. Best for clear "rags to riches" or steady-climb stories. Childhood -> Education -> Career -> Family -> Legacy.

**Option B: Thematic Weaver** — Chapters organized by lesson, not date. "On Resilience" mixes stories from age 12, 30, and 50. Best for chaotic or circular lives.

**Option C: Flashback/Cinematic** — Start with the most significant event, then jump back to show how they got there.

### Phase 3: Context Injection

Make the story feel bigger by weaving in historical context the user forgot or didn't think to mention. Ground the personal in the objective — gives it weight without the user needing to be a historian.

### Phase 4: Bridge Building

The mark of a bad biography: "And then... and then... and then."
The mark of a good one: causality.

A dedicated AI pass for writing transitions between anecdotes. Look at Story A and Story B, generate the logical link:

> Story A: "I quit the football team because I hated the coach."
> Story B: "I started my first business at 22."
> Bridge: "Walking away from the team taught me early on that I couldn't thrive under arbitrary authority. That same realization drove me, four years later, to stop looking for a boss and start my own company."

### Phase 5: Voice Calibration

Polish the prose without erasing their voice.

- Analyze the user's linguistic fingerprint during interviews (short/punchy vs. flowery, regional slang, etc.)
- Ghostwriter prompt: maintain their vocabulary and tone, fix grammar and pacing
- Keep the human, remove the rough edges

## The Narrative Architecture Template

Five modules that map to interview prompts:

**Module 1: The Hook** — Don't start with "I was born in..." Start with a defining moment. "Describe a moment where you had to make a decision that changed everything."

**Module 2: The Origin & Constraints** — Go back to the beginning, but focus on limitations. "What was the biggest constraint you faced growing up? How did it shape your default view of the world?"

**Module 3: The Inciting Incident** — The moment they left normal. "What specific event forced you out of your comfort zone?"

**Module 4: The Ordeal** — The most important section. The middle years where things went wrong. "Tell me about a time you failed or hit a wall. What broke? How did you fix it?"

**Module 5: The Synthesis** — Not just "and now I'm here." What was learned. "Looking back at the constraints from the beginning, how have you transcended them?"

## Ideas for the Interview Phase (To Make Stitching Easier)

### Thematic Sessions over Random Topics

Instead of picking random topics from a catalog, group into sessions: "The Early Years," "Career & Ambition," "Love & Family." The user is mentally in that era — stories will naturally overlap and create connective tissue.

### The Depth Gauge

Short answers kill biographies. If a response lacks sensory details, names, or specific dialogue, the AI should probe before moving on. We're not collecting facts — we're mining for *scenes*. A biography is made of scenes, not facts.

### Tag On the Fly

Don't wait until the end to analyze. As the chat happens, a background process tags chunks: date, characters, sentiment, location. When stitching time comes, you have a structured database, not a wall of text. Query "all stories involving Grandmother sorted by date" and you have a chapter draft.

### The Inconsistency Checker

If the AI detects a contradiction ("I never cared about money" vs. "I took the job for the cash"), present it not as an error but as a prompt for depth: "That tension is really interesting — let's explore that change." Contradictions become character arcs.

## Where We Are Now

The chat interview is the right foundation. It removes friction, captures voice, and allows iteration. You can always fix structure later, but you can never invent details you didn't capture.

The quality of the raw material determines the quality of the final product. Rich, detailed stories via depth probing make stitching tractable. Short one-word answers make it impossible no matter how good the synthesis AI is.

## Open Questions

1. How do we detect "pivotal moments" vs. routine stories algorithmically?
2. Can we detect emotional engagement vs. going through the motions from text alone?
3. What's the right granularity for auto-tagging — too coarse misses connections, too fine creates noise?
4. Should the narrative architecture be chosen by the AI, the user, or collaboratively?
5. How do we handle the "unreliable narrator" problem gracefully?
6. What's the minimum number of interview hours needed before synthesis produces something worthwhile?
