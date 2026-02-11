# Doc Updater Memory

## Project Structure
- `docs/INDEX.md` is the central documentation index with "When to Consult" quick-reference + detailed sections
- INDEX.md style: bold file paths with dash-separated descriptions, one line per entry
- Plans live in `docs/plans/active/` (numbered by phase, e.g., `0.1-nextjs-scaffold.md`) and move to `docs/plans/completed/` when done
- Decision records in `docs/decisions/`, numbered sequentially (001-010 exist)
- Architecture docs in `docs/architecture/`

## Conventions
- Active Plans section header includes the current phase name in parens, e.g., "Active Plans (Phase 0: Foundation)"
- Plan descriptions are terse: key technologies/concepts only, no sentences
- Roadmap is a separate top-level file at `docs/roadmap.md`
- `docs/stack.md` lists the tech stack — one line per technology, terse

## Completed Plans
- 0.1: Next.js scaffold
- 0.2: Testing infrastructure (Vitest 4, Playwright, RTL, Node 22)
- 0.3: Prisma + Database (Prisma 6, PostgreSQL 16, Docker Compose, Auth.js models)

## Lessons
- When a plan is marked Complete, move it from Active to Completed in INDEX.md and note that the file should also be moved from `active/` to `completed/` on disk
- `docs/stack.md` should be checked when runtime/tooling changes (e.g., Node version bump)
