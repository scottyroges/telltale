# ADR 003: Prisma ORM

**Status:** Accepted
**Date:** 2025-02

## Context
Need an ORM that generates TypeScript types from the database schema and handles migrations.

## Decision
Use Prisma as the ORM.

## Alternatives Considered
- **Drizzle** — lighter weight, closer to SQL, but less mature ecosystem
- **TypeORM** — decorator-heavy, weaker type inference
- **Raw SQL** — maximum control but no type generation, manual migration management

## Consequences
- Schema is the single source of truth for types across the entire stack
- Generated client provides full type safety for all database operations
- Mature migration system for schema evolution
- Repository layer wraps Prisma to keep services ORM-agnostic
