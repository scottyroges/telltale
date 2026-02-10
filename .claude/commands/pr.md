Generate a PR description or commit message from code changes.

Usage:
  /pr                              — describe staged changes
  /pr last                         — describe the last commit
  /pr main...feature-branch        — describe a branch diff
  /pr HEAD~5                       — describe the last 5 commits

Dispatch this to the pr-writer agent. It will assess scope and produce either a commit message (small changes) or full PR description (larger changes).
