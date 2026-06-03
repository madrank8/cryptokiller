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
- Typecheck + build, then grep the bundle for fingerprints of the new code.
- Unit-test pure helpers in isolation: import `node-html-markdown` directly from
  `node_modules` and copy the helper function into a tiny `/tmp/*.mjs` script (avoids
  importing the heavy prerender module which throws on missing PORT/DATABASE_URL).
- Final functional verification happens against production after Publish (curl the
  live domain). One boot occasionally succeeds with `node --max-old-space-size`, but
  it is unreliable — don't depend on it.
