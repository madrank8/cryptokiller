---
name: crypto-review SSR local testing
description: How to verify the crypto-review production SSR server when the bash sandbox OOM-kills it
---

The crypto-review production SSR bundle (`artifacts/crypto-review/dist/server/index.mjs`)
frequently gets SIGKILL/OOM-killed (bash exit 137/143) when booted inside the bash
tool sandbox — the bundled prerender module + pg Pool is heavy. The dev workflow runs
`vite` (no SSR), so SSR-only behavior (locale routing, `<html lang>`, hreflang, Link
headers, `.md` endpoints) is NOT observable in dev preview either.

**How to verify SSR-only logic without a full boot:**
- **Preferred:** import `renderPage` from `server/prerender.ts` directly in a tiny
  `server/_verify_*.ts` script and run it with
  `NODE_OPTIONS=--max-old-space-size=512 pnpm --filter @workspace/crypto-review exec tsx server/_verify_*.ts`.
  The `pnpm --filter ... exec` env provides DATABASE_URL, so `renderPage("/...")`
  returns real `{status, bodyHtml, ...}` you can assert on. This is reliable (unlike
  booting the bundled prod server) and exercises the actual code path, not a copy.
  To test a branch no live row triggers (e.g. the modern `full_article` byline path —
  0 of the published reviews currently populate `full_article`/`authorPersonaId`, so
  they all hit the legacy branch), do a controlled DB round-trip: save a row's
  original values, UPDATE to set test values, render, assert, then restore the exact
  originals in a `finally`. Delete the temp `_verify_*.ts` script when done.
- Typecheck + build, then grep the bundle for fingerprints of the new code.
- Final functional verification happens against production after Publish (curl the
  live domain). Booting the bundled prod server with `node --max-old-space-size` is
  unreliable (OOM/SIGKILL) — prefer the `renderPage` import above.
