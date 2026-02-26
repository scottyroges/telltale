# Processing Transcripts: Strategic Chunking with Overlap

This strategy is often called "Strategic Chunking with Overlap" (or a Map-Reduce approach).

While "All-at-Once" is the cheapest and easiest, it suffers from a specific failure mode called the "Lost in the Middle" phenomenon.

## The Problem with "All-at-Once": Attention Drift

If you feed a 50,000-token transcript (approx. 3-4 hours of audio) into an LLM in one go, the model's ability to recall specific facts often degrades in the middle of the document.

Models are excellent at retrieving information from the beginning (primacy effect) and the end (recency effect) of the prompt, but they often "gloss over" details buried in the center. If your transcript is long and the key events are subtle, a single massive call might miss 20% of the events simply because they were drowned out by the noise.

## The Middle Ground: Large Chunks with Overlap

Instead of processing line-by-line (too small) or the whole file (too big), you break the transcript into "chapters" or logical blocks.

### The Sweet Spot

- **Chunk Size:** 4,000 to 8,000 tokens (roughly 15-30 minutes of conversation). This is large enough to capture context but small enough for the model to maintain "high resolution" attention on every sentence.
- **The Critical Component: Overlap.** You typically overlap chunks by 10-20% (e.g., 500 tokens).

## Why Overlap is Non-Negotiable

If you make a clean cut at line 500, you risk splitting a key event in half.

- Chunk A (ends): "I think we should definitely..."
- Chunk B (starts): "...buy the company."

Without overlap, Chunk A sees an incomplete thought, and Chunk B sees a conclusion without a premise. Both chunks will likely fail to extract the event. With overlap, the "buy the company" conversation appears fully in at least one chunk.

## The Workflow (Map-Reduce)

### Map (The "Small" Calls)

You send 5 parallel API calls:

- Call 1: Minutes 0-20
- Call 2: Minutes 15-35 (note the 5-min overlap)
- Call 3: Minutes 30-50
- ...and so on.

**Result:** You get 5 separate JSON lists of extracted events.

### Reduce (The "Big" Call)

You take those 5 JSON lists, concatenate them, and send them to the LLM in one final call.

**Prompt:** "Here are several lists of events extracted from a transcript. Some are duplicates due to overlapping analysis. Please consolidate them into a single chronological list and remove duplicates."

## Cost & Performance Comparison

| Feature  | All-at-Once | Line-by-Line | Strategic Chunking |
|----------|-------------|--------------|-------------------|
| Cost     | Lowest      | Highest      | Medium            |
| Accuracy | Good for summaries; poor for specific detail extraction | Terrible (missing context) | Highest (high detail + context) |
| Speed    | Slow (sequential generation) | Slow (network overhead) | Fastest (can parallelize chunks) |
| Risk     | "Lost in the Middle" (missed events) | "Tunnel Vision" (misinterpreted events) | Duplication (requires a cleanup step) |

## Summary Recommendation

- **Transcript < 15k tokens:** Just do All-at-Once. Modern models can handle this easily without losing focus.
- **Transcript > 20k tokens:** Use Strategic Chunking. The cost of the overlap (redundant tokens) is worth the massive gain in accuracy.
