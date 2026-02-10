# ADR 005: Auth.js for Authentication

**Status:** Accepted
**Date:** 2025-02

## Context
Need authentication with OAuth and email support. Want to avoid paid dependencies early.

## Decision
Use Auth.js (NextAuth v5) with the Prisma adapter.

## Alternatives Considered
- **Clerk** — excellent DX but paid, adds vendor dependency before revenue
- **Supabase Auth** — ties us to Supabase ecosystem

## Consequences
- Free, no paid dependency before we have revenue
- Standard in Next.js ecosystem, well-documented
- OAuth (Google, etc.) + email auth support
- Prisma adapter stores auth data in our own database
- More setup work than managed solutions like Clerk
