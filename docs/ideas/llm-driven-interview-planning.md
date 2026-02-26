# Idea: LLM-Driven Interview Planning

**Status:** Exploration
**Created:** 2026-02-25

## Overview

Replace the catalog-driven question model with an LLM-driven planning approach. The user starts by telling us about themselves — who they are, what their life has looked like, what matters to them. We feed that into the LLM, which generates a set of initial interviews, each with a broad area of focus. After each interview, the LLM evaluates what was covered and proposes follow-up sessions targeting specific threads, time periods, or themes that deserve deeper exploration.

## The Problem with Catalog Questions

Predefined questions are inherently limiting:

- **They assume a generic life.** "Tell me about your childhood" works for everyone, but it doesn't know that *your* childhood was defined by moving every two years because of your parent's military career. A question catalog can't anticipate that.
- **They create artificial boundaries.** A question about "your first job" boxes the conversation into one narrow frame. The interesting story might be about how the user *got* that job — which is really a story about a relationship, not a career.
- **They miss what makes someone unique.** The best interviews follow the person, not a script. A catalog is a script.
- **They put the burden on the user.** The user has to browse questions and decide what's worth talking about before they've even started. Most people don't know what their best stories are until someone draws them out.

## How It Could Work

### 1. Onboarding Conversation

Instead of browsing a catalog, the user has a short intake conversation. Not a form — a conversation. The LLM asks a few open questions:

- Tell me a bit about yourself.
- What periods of your life feel most important to you?
- Is there anything you especially want to capture?
- Who are the key people in your story?

This gives the system enough signal to plan intelligently.

### 2. Generated Interview Plan

From the onboarding, the LLM produces a set of initial interview topics — not rigid questions, but areas of focus with enough context to guide a rich conversation. For example:

- "Growing up in rural Montana — family dynamics, small-town life, early independence"
- "The move to Chicago and starting over — leaving home, finding identity in a new place"
- "Building the business — the partnership with Dave, the early failures, what kept you going"

Each one is tailored to *this person's* life, not pulled from a generic list.

### 3. Post-Interview Reflection

After each interview, the LLM reviews what was covered and determines:

- **What threads opened but weren't fully explored.** ("You mentioned your sister's accident but we didn't go deep — that seems significant.")
- **What time periods or themes are still uncovered.** ("We've talked a lot about your 20s and 40s but almost nothing about your 30s.")
- **What follow-up interviews to suggest.** New sessions get added to the plan, each with a specific focus informed by everything gathered so far.

The interview plan is a living document that evolves as we learn more.

## What This Changes

- **No more catalog browsing.** The user's entry point is a conversation, not a menu.
- **Interviews are personalized from the start.** The first real interview already knows the user's name, key people, and broad life arc.
- **The system drives coverage.** Instead of hoping the user picks the right questions, the LLM ensures important ground gets covered and gaps get filled.
- **Topics emerge organically.** Follow-up interviews are based on what actually came up, not what we predicted would matter.

## Open Questions

- How much onboarding is enough? Too little and the initial plan is generic; too much and it feels like a chore before you've even started.
- Should the user be able to override or reorder the suggested plan? Or does that reintroduce the "browsing a catalog" problem?
- How do we handle the case where the LLM's plan misses something the user cares about? There needs to be an escape hatch for "I want to talk about X" that feeds back into the plan.
- Does the catalog still have a role — maybe as a fallback or inspiration source for the LLM's planning, rather than as the user-facing interface?
