# ADR 004: Neon for PostgreSQL Hosting

**Status:** Accepted
**Date:** 2025-02

## Context
Need a PostgreSQL host that works well with serverless (Vercel) and has a viable free tier for development.

## Decision
Use Neon as the PostgreSQL provider.

## Alternatives Considered
- **Supabase** — bundles many features we don't need (auth, storage, realtime), adds vendor coupling
- **PlanetScale** — MySQL-based, not Postgres
- **Self-hosted** — operational overhead not justified at this stage

## Consequences
- Pure Postgres — no vendor lock-in, can migrate to any Postgres provider
- Serverless connection pooling built in (important for Vercel's serverless functions)
- Generous free tier for development
- Clean integration with Prisma
