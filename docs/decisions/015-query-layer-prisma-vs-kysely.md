# ADR 015: Query Layer — Prisma vs Kysely

**Status:** Accepted
**Date:** 2026-02
**Supersedes:** ADR 003

## Context

ADR 003 chose Prisma as the ORM. Now that the repository layer is implemented (Plan 1.1), we have direct experience with how Prisma generates queries and can evaluate whether it's the right long-term choice.

The concern: Prisma hides the SQL it generates. It favors multiple separate queries over JOINs, and there's no way to optimize or even see the SQL without enabling query logging. For developers who prefer writing SQL directly — and who've been burned by ORMs generating unpredictable queries (JPA being the cautionary tale) — this opacity is a liability.

Our repository pattern already isolates Prisma behind an interface. Services never touch Prisma directly. This means swapping the query layer only requires changing repository internals — no service or router code changes.

## What Prisma Does Well

- **Schema-as-source-of-truth** — `schema.prisma` defines the data model, generates TypeScript types, and produces migrations. One file drives everything.
- **Migration system** — `prisma migrate dev` diffs the schema and generates SQL migration files automatically. Handles migration history, conflicts, and deployment (`prisma migrate deploy`).
- **Generated types** — The Prisma client provides compile-time type safety for all queries with zero manual type maintenance.
- **Ecosystem maturity** — Large community, extensive docs, well-tested edge cases.

## What Prisma Does Poorly

- **Query opacity** — You don't write SQL; Prisma generates it. For `include`/nested `select`, it issues separate queries per relation rather than JOINs. You can't see or control the SQL without enabling debug logging.
- **No JOIN control** — You cannot write `SELECT ... FROM book JOIN interview ON ...` through the Prisma API. Relation loading always uses separate queries or WHERE EXISTS subqueries.
- **Performance ceiling** — Prisma's Rust query engine adds overhead (~2x vs direct SQL in benchmarks). For simple CRUD this is negligible; for high-throughput queries it compounds.
- **Complex query limitations** — Window functions, CTEs, lateral joins, aggregations with GROUP BY — none of these are expressible through the Prisma query builder. You must drop to `$queryRaw` and lose all type safety.
- **Binary dependency** — Prisma ships a Rust query engine binary. This adds cold start latency in serverless environments and complicates deployment.

## The Alternative: Kysely

Kysely is a TypeScript SQL query builder — not an ORM. You write queries that mirror SQL structure, and Kysely provides full type safety through the chain.

```typescript
// Kysely: you see exactly what SQL this produces
const book = await db
  .selectFrom("book")
  .innerJoin("interview", "interview.book_id", "book.id")
  .select(["book.id", "book.title", "interview.status"])
  .where("book.id", "=", bookId)
  .executeTakeFirst();

// vs Prisma: multiple hidden queries
const book = await prisma.book.findUnique({
  where: { id: bookId },
  include: { interviews: { select: { status: true } } },
});
```

**What Kysely does well:**
- Full SQL control — JOINs, CTEs, window functions, subqueries, all type-safe
- Query output is predictable — the SQL maps 1:1 to what you write
- No binary dependency — pure TypeScript, ~50kb
- Compile-time type safety through the entire query chain
- `sql` template tag for raw SQL with automatic parameterization
- Can generate types from Prisma schema via `prisma-kysely` (best of both worlds for migrations)

**What Kysely lacks:**
- No auto-generated migrations — you write them manually, or keep using Prisma Migrate alongside it
- No schema DSL — types come from a `Database` interface (manual, or generated via `kysely-codegen` / `prisma-kysely`)
- Smaller community than Prisma or Drizzle (~1.2M weekly npm downloads vs Prisma's ~10M)
- More verbose for simple CRUD — a `findUnique` is more code in Kysely than Prisma

## Other Options Considered

**Drizzle** — SQL-like query builder with auto-generated migrations via Drizzle Kit. Fastest-growing in the ecosystem (~4.6M weekly downloads, ~33K GitHub stars). However, still in beta (v1.0.0-beta.2 as of Feb 2025) with breaking changes, and there are community concerns about project maintenance velocity. The beta status is a risk for a production foundation.

**Slonik** — Raw SQL only via tagged template literals. Strongest SQL injection protection (structurally impossible to bypass). Runtime type validation via Zod. But PostgreSQL-only, very small community (~70K weekly downloads), and no query builder means complex dynamic queries require string assembly.

**Plain pg** — Maximum control, zero abstraction. But `result.rows` is `any[]` — no type safety without external tooling. Building dynamic queries safely requires discipline.

## The Hybrid Path: Prisma Migrate + Kysely Queries

A popular pattern in the community: use Prisma for what it's best at (schema + migrations) and Kysely for what it's best at (queries).

- Keep `schema.prisma` as the schema source of truth
- Keep `prisma migrate` for migrations
- Use `prisma-kysely` to generate Kysely's `Database` type from the Prisma schema
- Write all repository queries in Kysely instead of the Prisma client
- Remove the Prisma client runtime dependency entirely (keep only `prisma` CLI as a dev dependency)

This gives us: auto-generated migrations, auto-generated types, full SQL control, no query opacity, no Rust binary at runtime.

## Trade-offs Summary

| Aspect | Prisma (current) | Kysely (proposed) | Hybrid (Prisma Migrate + Kysely) |
|---|---|---|---|
| SQL control | None (generated) | Full | Full |
| JOINs | Separate queries | Native SQL JOINs | Native SQL JOINs |
| Type safety | Generated, automatic | Generated or manual | Generated from Prisma schema |
| Migrations | Excellent (auto-diff) | Manual only | Prisma Migrate (auto-diff) |
| Query predictability | Low | High | High |
| Simple CRUD verbosity | Low | Medium | Medium |
| Runtime dependency | Rust binary | Pure TypeScript | Pure TypeScript |
| Community size | Largest | Medium | N/A (uses both) |

## Risk Assessment

**Risk of staying with Prisma:** Query opacity becomes a real problem as the app grows. Interview context assembly, cross-book insight queries, and story generation may need JOINs, CTEs, or aggregations that Prisma can't express cleanly. We'd end up using `$queryRaw` for complex queries (losing type safety) while keeping the Prisma client overhead for simple ones.

**Risk of switching to Kysely:** More verbose simple CRUD. Slightly more manual work per query. The repository layer insulates this — the extra verbosity is confined to repository files and doesn't leak into services.

**Risk of the hybrid approach:** Two tools in the data layer. Developers need to understand both Prisma (for schema/migrations) and Kysely (for queries). The `prisma-kysely` bridge is a third-party package that must stay compatible with both.

**Mitigating factor:** Our repository layer means this decision is contained. Swapping Prisma client calls for Kysely calls inside repositories requires zero changes to services, routers, domain types, or tests (beyond updating mocks).

## Decision

**Option 2: Hybrid — Prisma Migrate + Kysely queries.**

- Keep `schema.prisma` as the schema source of truth
- Keep `prisma migrate` for auto-generated migrations
- Use `prisma-kysely` to generate Kysely's `Database` type from the Prisma schema
- Write all repository queries in Kysely instead of the Prisma client
- Remove the Prisma client runtime dependency entirely (keep `prisma` CLI as a dev dependency)

This gives us full SQL control with type safety, predictable query output, no Rust binary at runtime, and Prisma's excellent migration system.

### Better Auth

Better Auth uses Kysely internally as its built-in adapter. Passing `{ db, type: "postgres" }` shares the application's Kysely instance (and connection pool) with Better Auth — no separate adapter package needed. This eliminates the `@prisma/client` dependency entirely.

### Impact on Existing Code

The repository layer (Plan 1.1) isolates this change completely. All 9 repositories currently use Prisma client calls — these will be rewritten to use Kysely. **No changes needed to:**
- Domain types (`src/domain/`)
- Services (`src/services/`)
- tRPC routers (`src/server/routers/`)
- Active plans 1.2–1.6 (they interact with repositories, not the query layer directly)

**Changes needed:**
- All 10 repository files in `src/repositories/` — rewrite internals from Prisma client to Kysely
- `src/lib/prisma.ts` — delete; replaced by `src/lib/db.ts` (Kysely database instance)
- `src/server/auth.ts` — use Kysely adapter (`{ db, type: "postgres" }`) instead of Prisma adapter
- Repository test mocks — update to mock Kysely instead of Prisma client
- `package.json` — add `kysely`, `pg`, `prisma-kysely`; remove `@prisma/client` entirely
