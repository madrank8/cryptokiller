---
name: crypto-review deploy edge behavior (headers / HTTP3)
description: Which Website-Spec audit signals on the deployed site are controlled by Replit's edge, not app code.
---

# crypto-review — Replit edge overrides on the deployed site

When auditing the LIVE site (cryptokiller.org) against The Website Specification,
some signals are governed by Replit's deployment edge/proxy, NOT by
`artifacts/crypto-review/server/index.ts`:

- **Cache-Control gets a `private` prefix** on the live response even though the
  app sets `public, max-age=...`. The edge rewrites it. So a "Cache-Control uses
  private" audit finding is not fixable in app code. The app-side parts that DO
  matter are already correct: SSR HTML = short `max-age=300`; fingerprinted
  `/assets/*` = `immutable, max-age=31536000` (non-fingerprinted root files like
  favicon/og/manifest are intentionally long-cached but NOT immutable).
- **HTTP/3 (h3) is advertised by the edge** via `alt-svc: h3=":443"`. No app/CDN
  config needed; an audit claiming "HTTP/3 not advertised" is stale.

**Why:** avoid burning time trying to "fix" these in server code — they are edge
behavior. Re-check against the freshly published site before treating spec
findings as real; several findings in past audits were stale (old deploy).

**How to apply:** for Website-Spec / header audits here, separate code-fixable
items (CSP, contrast, touch targets, preload, manifest contents, favicons) from
edge/DNS items (Cache-Control `private`, HTTP/3, CAA, DNSSEC).
