# ADR 005: Better Auth for Authentication

**Status:** Accepted
**Date:** 2026-02
**Supersedes:** [005-authjs.md](./005-authjs.md) (original ADR 005 — Auth.js)

## Context

The original ADR 005 chose Auth.js (NextAuth v5) for authentication. Auth.js v5 never reached a stable release — it remained in beta since October 2023, and the lead maintainer left in January 2025. The project was handed over to the Better Auth team in September 2025.

This decision supersedes the original ADR 005.

## Decision

Use Better Auth with the Prisma adapter.

## Alternatives Considered

- **Auth.js v5 (beta)** — no stable release, maintenance-only since handover
- **Clerk** — excellent DX but paid, adds vendor dependency before revenue
- **Supabase Auth** — ties us to the Supabase ecosystem

## Consequences

- Free, no paid dependency before we have revenue
- TypeScript-first with strong type inference (`$Infer`)
- Active development backed by $5M funding
- Prisma adapter built-in (single `better-auth` package)
- Plugin system for future needs (MFA, organizations, rate limiting)
- DB sessions with signed cookie caching — no JWT strategy needed
- More setup work than managed solutions like Clerk
