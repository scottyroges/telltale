Review code changes in two stages: spec compliance, then code quality.

Usage:
  /pr-review                          — review staged changes
  /pr-review last                     — review the last commit
  /pr-review HEAD~3                   — review the last 3 commits
  /pr-review main...feature-branch    — review a branch diff
  /pr-review abc123..def456           — review a commit range

Options:
  /pr-review --spec "description"     — provide what the changes should accomplish
  /pr-review --spec docs/plans/active/auth-refactor.md — reference a plan file as the spec

Dispatch this to the code-reviewer agent. Pass the scope and spec if provided. If no spec is given, the agent will infer intent from the code and commit messages.
