# Idea: Interview Categories & Cross-Topic Thread Following

**Status:** Exploration
**Created:** 2026-02-25

## Overview

Group interviews into broader categories (e.g., "Early Life" covers childhood, school, hometown topics). Use these categories to identify when loose threads from one interview are relevant to another, giving the interviewer a natural opportunity to follow up across topic boundaries.

## The Opportunity

Today, interviews are scoped to a single topic. If a childhood interview surfaces a thread about school — say, a teacher who changed the user's life — that thread sits in insights but never gets picked up unless the user happens to start a school interview.

With category awareness, the interviewer could recognize that "school" and "childhood" fall under the same broader category. When the user starts a school-focused interview, the system already knows about that teacher thread and can weave it in naturally: *"Last time we talked about your childhood, you mentioned a teacher who really made an impression. Tell me more about that."*

## How It Could Work

1. **Categories on interviews.** The question catalog already groups questions into categories. When an interview is created from a catalog question, it inherits the category. For free-form topics, the system infers or the user picks one.
2. **Tag insights with category.** When insights are extracted, associate them with the category of the interview that produced them.
3. **Cross-category relevance.** When assembling context for a new interview, pull in insights from the same or related categories, not just the current topic.
4. **Interviewer prompt awareness.** The system prompt tells the interviewer which related threads exist and encourages natural follow-up when the conversation opens the door.

## What This Doesn't Change

- Interviews still have a single topic — this isn't about merging interviews.
- The user still drives the conversation — the interviewer follows up only when threads arise naturally, not by forcing a topic change.

## Open Questions

- How granular should categories be? Too broad and everything is related; too narrow and we're back to topic silos.
- Should the interviewer proactively raise a thread, or only follow up when the user touches on something adjacent?
- How do we avoid the interviewer feeling repetitive if the user already covered a thread in depth elsewhere?
