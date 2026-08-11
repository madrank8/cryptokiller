---
name: Recent-ads CTA safety policy
description: Locked policy for outbound "view ad" CTAs on review pages; where the safe CTA is derived.
---

Locked policy (Peak Luxentria audit handoff): public "view ad" CTA hrefs may ONLY be
(1) a Facebook post permalink, (2) a Meta Ad Library search URL for the brand, or (3) omitted.
Forbidden as hrefs: raw creative `link_url`, brand landing URLs, archive "live fallback" URLs,
and anything matching `/click`, `fbclid`, `token_fb`, `pixel_fb`.

**Why:** review pages previously rendered "View archived ad" buttons pointing at live
SpyOwl/Meta click trackers — sending readers into the scam funnel from an investigative site.

**How to apply:** the safe CTA (`ctaUrl`/`ctaLabel`/`ctaRel`) is derived at the SOURCE in the
lockstep pair `artifacts/api-server/src/lib/supabase-recent-ads.ts` and
`artifacts/crypto-review/server/supabase-recent-ads.ts`; raw `link_url` never leaves those
modules (only its hostname, `linkDomain`, for display-only text). Renderers (CSR RecentAdsGrid
+ SSR prerender grid) must use `ctaUrl` exclusively. Note: recent ads are LIVE-derived from
Supabase — the sync payload's `recent_ads_sample` is intentionally ignored (legacy table
dropped); do not resurrect stored samples without revisiting that decision. Any change to the
RecentAd shape requires updating lib/api-spec/openapi.yaml + `pnpm --filter @workspace/api-spec
run codegen` + `pnpm run typecheck:libs`, and is gated by the agent-api verify workflow.

## Lockstep decision (grid ↔ JSON-LD, SSR ↔ CSR)
- One shared builder produces the ad-evidence JSON-LD for both render paths, and each SSR review render embeds its recent-ads snapshot — even an empty one — which the hydrated client treats as authoritative over the API copy.
- **Why:** SSR and CSR fetch recent ads through independent short-lived caches; without one authoritative per-render snapshot, a JS-executing crawler could see structured data disagree with the first-byte HTML. Empty must win too, or fresher API data conjures ads absent from the SSR page.
