---
name: crypto-review {{stat:KEY}} token substitution invariant
description: Every surface that renders review prose must resolve {{stat:KEY}} tokens per-row against that row's own review_stats — including list views, webmcp, and SSR list pages.
---

# {{stat:KEY}} tokens can appear in ANY review prose field — including `verdict`

The upstream CMS emits `{{stat:KEY}}` tokens (keys: ad_creatives, countries_targeted,
celebrities_abused, weekly_velocity, days_active, first_detected, last_active;
modifiers `|raw`, `|short`, `|iso`, default = long locale date) in ALL prose fields.
`verdict` is rendered on LIST surfaces, not just the review page.

**Why:** A leak audit found tokens would surface on home, investigations, author hub,
related-scams cards, and webmcp tool results — anywhere verdict text renders — not
just the review detail page that already deep-walked the full review object.

**How to apply:** Any NEW surface that renders review prose (even one field like
verdict) must substitute per-row against THAT row's own stats first:
- CSR: `substituteStatTokensInReview(row)` from `src/lib/statTokens.ts` (deep-walk, generic).
- SSR (prerender.ts): join `review_stats` (`LIST_ROW_STATS_COLUMNS`) and use
  `substituteListRowText(text, row)`; escape AFTER substitution.
- API list/related endpoints return tokens RAW plus all 7 stat fields per row —
  substitution is intentionally client/render-side, so new API consumers must
  substitute themselves.
- Null/missing stat leaves the literal token by design (editorial catch); the API's
  `?? 0` defaults only kick in when the whole stats row is absent.
- `{{platform_stat:...}}` is a DIFFERENT token family — never touched by this pipeline.
