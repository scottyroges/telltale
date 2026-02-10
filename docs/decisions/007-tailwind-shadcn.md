# ADR 007: Tailwind CSS + shadcn/ui

**Status:** Accepted
**Date:** 2025-02

## Context
Solo developer who is not a CSS expert. Need a styling approach that's fast to develop with and produces polished results.

## Decision
Use Tailwind CSS for utility-first styling and shadcn/ui for pre-built accessible components.

## Alternatives Considered
- **CSS Modules** — more traditional, but slower to develop with
- **styled-components** — runtime CSS-in-JS, adds bundle size, different mental model

## Consequences
- Utility-first CSS is fast for iterating on UI
- shadcn/ui provides polished, accessible component primitives (not a dependency — components are copied into the project)
- Consistent visual design without needing deep CSS expertise
- Tailwind is standard in the Next.js ecosystem
