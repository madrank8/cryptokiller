---
name: crypto-review SSR review render paths
description: Reviews SSR-render via two mutually-exclusive paths; current data uses the legacy one, so per-review SSR additions must cover both.
---

`renderReview()` in `artifacts/crypto-review/server/prerender.ts` emits hand-written HTML via TWO mutually-exclusive branches:
- **full_article path** — has `id="article-body"` and a `<nav aria-label="Investigation footer">` back-link block.
- **legacy fallback path** — bare `<p><a href="/investigations">Back to all investigations…</a></p>`, no `article-body`, no nav wrapper.

**Why this matters:** current published reviews (e.g. flagship `quantum-ai`, `valdorexa`) render through the **legacy** path, not full_article. So any per-review SSR content added to only the full_article branch shows up on **zero** current review pages and silently passes a quick code read. Verify per-review SSR features against a real legacy slug via the prod SSR build + curl, not just the full_article branch.

**How to apply:** when adding SSR content "to every review", edit BOTH the full_article and legacy branches (blog has its own single path in `renderBlogPost`). Dev server does NOT SSR article pages — verify only via `PORT=<p> BASE_PATH=/ pnpm --filter @workspace/crypto-review run build` then run `dist/server/index.mjs` and curl the slug.
