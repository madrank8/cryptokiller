---
name: crypto-review www subdomain & GSC robots quirks
description: www.cryptokiller.org is NOT linked to the Replit deployment; Cloudflare proxies it and returns 525 → GSC "5xx robots.txt". Apex robots.txt "1 issue" in GSC is the intentional Content-Signal line.
---

# www.cryptokiller.org status (as of 2026-07-26)

- DNS for apex + www both live on Cloudflare (proxied, orange-cloud; hosts resolve to 104.21.x/172.67.x).
- Replit deployment has ONLY `cryptokiller.org` linked (`getDeploymentInfo().primaryUrl`); `www` is not a linked domain, so Replit's edge has no cert for it → Cloudflare→origin TLS handshake fails → **525** on `https://www.cryptokiller.org/*`.
- `http://www` 301s to `https://www` (Cloudflare Always-Use-HTTPS), then 525s — so GSC shows 5xx for both www properties.
- **Why:** canonical domain is apex (sitemaps, IndexNow, canonicals all use `https://cryptokiller.org`), so www was never provisioned.
- **How to apply:** recommended fix is a Cloudflare Redirect Rule (www → apex 301, edge-level, no origin cert needed). If the user instead links www in Replit Publishing → Domains, the app must add a host-based 301 www→apex to avoid duplicate content. Re-verify with `curl -sI https://www.cryptokiller.org/robots.txt` — expect 301 to apex, not 525.

# GSC robots.txt report quirks

- Apex robots.txt row shows "1 issue": Google's parser flags the non-standard `Content-Signal:` line as an unknown rule. Intentional (contentsignals.org AEO strategy) — ignore, do not remove.
- While a host's robots.txt returns 5xx, Google stops crawling that ENTIRE host (treats as temporarily disallowed) — another reason www 525 must be fixed via redirect.
