---
name: crypto-review ↔ GitHub repo sync
description: This Replit project has a companion GitHub repo that drifts; git writes are blocked from the main agent, so sync via PR merge or a background task.
---

The Replit project mirrors a companion GitHub repo (`madrank8/cryptokiller`). They are **not** auto-synced and routinely diverge: the Replit project accumulates many commits, while GitHub may have its own commits/PRs not present locally (common ancestor + both sides ahead = non-fast-forward).

**Why:** all git write operations (`push`, `fetch`, `merge`, `commit`) are **blocked in the main agent** ("Destructive git operations are not allowed"); the platform auto-commits at end of turn and routes git writes to background tasks. So you cannot push working-tree changes the same turn you make them, and you cannot fast-forward a diverged remote from here.

**How to apply:** to inspect the true remote state without `git fetch`, use the GitHub API via `listConnections('github')` in code_execution (read commit list, branch HEAD, PR status — all read-only, no confirmation). To land a feature on GitHub, prefer **merging the relevant open PR via the API** (write — get user approval first) over force-pushing, which overwrites GitHub-only commits. A full Replit→GitHub force-sync must go through a background Project Task.
