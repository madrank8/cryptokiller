---
name: crypto-review cache-freshness policy
description: Why DB-backed dynamic pages send max-age=0 must-revalidate while static pages keep SWR.
---

# crypto-review HTML/MD cache policy (server/index.ts)

Dynamic, DB-backed pages — review, blog post, homepage, investigations/blog
listings, i.e. anything where `renderPage` returns a `lastModified` derived from
a row's `updated_at` — send `Cache-Control: public, max-age=0, must-revalidate`.
Truly static pages (about/terms/privacy/methodology/ai-disclosure/report/
recovery — no `lastModified`) keep `public, max-age=300, stale-while-revalidate=600`.
Applied in BOTH the markdown and html response branches.

**Why:** synced admin edits were masked for up to ~5 min by the old max-age=300
SWR window. Gating the no-cache policy on `lastModified` makes edited content
appear on the next request. The homepage/listings revalidating too is
INTENTIONAL (they surface the most recent reviews), confirmed not-a-defect in
review — do NOT "optimize" them back to SWR.

**How to apply:** a new dynamic page opts into revalidation simply by having
`renderPage` return a `lastModified`. New static pages must NOT set
`lastModified`, so they keep the long SWR cache.
