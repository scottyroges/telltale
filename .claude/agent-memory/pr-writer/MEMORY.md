# PR Writer Memory — Telltale

## Commit Style
- Format: `feat(scope): short summary (#PR)`
- PR number is included in the title for merged commits (added by GitHub squash merge)
- When writing a pre-merge commit message, omit the PR number; GitHub adds it on merge
- Body: 2-4 sentences explaining why, not what. Wrap at ~80 chars.
- Types in use: feat, fix, refactor, docs, test, chore, ci
- Scopes used: insight, interview, books, dashboard, domain, ci

## PR Description Style
- PRs reference their plan number in the title: "Plan 1.5 PR 1"
- Small PRs (single service/domain file): commit message is sufficient
- Larger PRs use full description with What / Why / How / Testing sections

## Plan References
- Active plans live in `docs/plans/active/`
- Decision records (ADRs) in `docs/decisions/`, numbered 001–016
- Plans split into numbered PRs; reference as "Plan X.Y PR N" in titles
