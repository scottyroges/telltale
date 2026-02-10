# Doc Updater Memory

## Project Structure
- `docs/INDEX.md` is the central documentation index with "When to Consult" quick-reference + detailed sections
- INDEX.md style: bold file paths with dash-separated descriptions, one line per entry
- Plans live in `docs/plans/active/` (numbered by phase, e.g., `0.1-nextjs-scaffold.md`) and move to `docs/plans/completed/` when done
- Decision records in `docs/decisions/`, numbered sequentially (001-009 exist)
- Architecture docs in `docs/architecture/`

## Conventions
- Active Plans section header includes the current phase name in parens, e.g., "Active Plans (Phase 0: Foundation)"
- Plan descriptions are terse: key technologies/concepts only, no sentences
- Roadmap is a separate top-level file at `docs/roadmap.md`
