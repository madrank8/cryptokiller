---
name: crypto-review www subdomain & GSC robots quirks
description: www.cryptokiller.org is NOT linked to the Replit deployment; Cloudflare proxies it and returns 525 → GSC "5xx robots.txt". Apex robots.txt "1 issue" in GSC is the intentional Content-Signal line.
---

# www.cryptokiller.org — RESOLVED 2026-07-26

- DNS for apex + www both live on Cloudflare (proxied, orange-cloud). Replit deployment has ONLY `cryptokiller.org` linked; `www` has no origin cert, so direct origin traffic for www would 525 (Cloudflare↔origin TLS handshake fails).
- **Fix in place:** Cloudflare Single Redirect rule "Redirect from WWW to root" (template: `https://www.*` → `https://${1}`, 301). Verified: https+http www URLs 301 to apex with paths preserved. The www DNS record MUST stay proxied (orange) or the rule stops firing and browsers hit the certless origin.
- **Why:** canonical domain is apex (sitemaps, IndexNow, canonicals all use `https://cryptokiller.org`); redirecting at Cloudflare's edge avoids provisioning www on Replit entirely.
- **How to apply:** if www ever 525s again, first suspect the CF redirect rule was disabled/deleted or the www record was grey-clouded. Re-verify with `curl -sIL https://www.cryptokiller.org/robots.txt` — expect 301→apex→200. Note CF rule deploys propagate unevenly for ~1 min (mixed 301/525 across requests is normal right after deploy).

# GSC robots.txt report quirks

- Apex robots.txt row shows "1 issue": Google's parser flags the non-standard `Content-Signal:` line as an unknown rule. Intentional (contentsignals.org AEO strategy) — ignore, do not remove.
- While a host's robots.txt returns 5xx, Google stops crawling that ENTIRE host (treats as temporarily disallowed) — another reason www 525 must be fixed via redirect.
