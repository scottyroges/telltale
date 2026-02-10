Update project documentation based on recent code changes.

Usage:
  /update-docs              — document changes from the last commit
  /update-docs staged       — document currently staged changes
  /update-docs HEAD~3       — document changes from last 3 commits
  /update-docs abc123..def456 — document a specific commit range

Dispatch this to the doc-updater agent with the requested scope. If no argument is given, default to the last commit.
