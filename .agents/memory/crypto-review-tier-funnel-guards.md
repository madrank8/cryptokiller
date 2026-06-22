---
name: crypto-review tier & funnel guards
description: Non-obvious traps when gating declarative "scam" framing by threat tier and when deduping funnel_stages on review pages.
---

# Tier gating: tierFromScore vs resolveReviewTier

`reviews.frame_as_scam` is `NOT NULL DEFAULT false` (migration 0003). Pre-migration
rows therefore persist `false` **explicitly**, not null. `resolveReviewTier` does
`row.frameAsScam ?? fallback.frameAsScam` — and `false ?? true === false`, so the
nullish fallback NEVER kicks in for those rows. A 90/100 confirmed-scam review
resolves to `frameAsScam:false` and gets hedged framing.

**Rule:** Score-gated *declarative* UI (the hero badge red/"Confirmed Scam", deposit
warning, status chip, verdict headline in `ReviewPage.tsx`) must derive its tier from
`tierFromScore(score)` (pure score), NOT `resolveReviewTier`.

**Why:** Legal exposure — a low-signal brand must never be labelled a confirmed scam,
and a genuine high score must keep the red badge. Score-gating guarantees both;
resolveReviewTier (data-aware) silently under/over-frames on pre-migration rows.

**Accepted residual divergence:** JSON-LD (ReviewPage `jsonLd` useMemo) and the SSR
prerender still use `resolveReviewTier`. So a pre-migration review with score ≥ 80 and
`frame_as_scam=false` shows a red "CONFIRMED SCAM" badge client-side while its SSR
title/JSON-LD use hedged "Investigation" framing. This is directionally safe (schema
is the conservative side). To eliminate it: backfill `frame_as_scam` for 80+ rows, or
align JSON-LD/SSR with `tierFromScore`. Don't "fix" one side in isolation.

# Funnel dedup tie-break

When deduping a list and a *later* step filters rows by some derived metric (here:
prose length after stripping markdown images / `<img>` / `<figure>` / tags), the
dedup tie-break MUST use that same metric, not raw string length.

**Why:** A funnel stage that is image-only has a long markdown image URL, so it wins a
raw-length tie-break against the real prose row for the same `stage_number` — then the
prose filter drops it, silently deleting the stage entirely (renders [1,2,3] not
[1,2,3,4]). `normalizeFunnelStages` in `api-server/.../routes/reviews.ts` tie-breaks on
`funnelProseLength`. The SSR prerender's older dedup is weaker (keeps first row, no
prose filter, no cap) — they are intentionally NOT identical.
