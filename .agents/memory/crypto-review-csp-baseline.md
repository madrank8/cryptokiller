---
name: crypto-review CSP & third-party baseline
description: Why the crypto-review CSP is strict and has no ad/external-font origins; what must not be silently reintroduced.
---

# crypto-review CSP / third-party baseline

The production SSR server (`artifacts/crypto-review/server/index.ts`) sets a
strict CSP: `script-src 'self'` (NO `unsafe-inline`/`unsafe-eval`/`blob:`), no
Google ad origins, `font-src 'self' data:`, `frame-src 'self'`. Fonts (Inter)
are self-hosted via `@fontsource/inter` (same-origin `/assets/*.woff2`).

**Why:** Google AdSense was deliberately REMOVED and Google Fonts self-hosted to
satisfy The Website Specification's Security category — AdSense was the sole
source of the `GAESA` cookie (required cookie-attribute finding), forced
`unsafe-inline`/`unsafe-eval` in `script-src` (CSP finding), and was an
un-hashable cross-origin script (SRI finding); Google Fonts were the other two
SRI findings. The user explicitly approved removing AdSense (accepting ad-revenue
loss) and self-hosting fonts.

**How to apply:** Do NOT reintroduce `unsafe-inline`/`unsafe-eval`, ad/analytics
script origins, or external font origins without an explicit CSP review. The only
inline `<script>` the page emits is escaped `application/ld+json` (a data block
NOT governed by `script-src`), so it needs no allowance. If a new third-party
embed is added, expect to widen CSP and re-check these spec findings.

Out-of-code spec items for this domain: CAA records + DNSSEC live at the DNS
provider/registrar, not in app code. A wrong CAA record can block TLS renewal, so
it must list the CA that Replit Deployments actually uses before being added.
