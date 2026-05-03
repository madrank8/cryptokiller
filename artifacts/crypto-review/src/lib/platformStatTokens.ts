// Platform-stat token substitution.
//
// Article writers (Vercel side) emit literals of the form `{{platform_stat:KEY}}`
// — and `{{platform_stat:KEY|<modifier>}}` for format variants — in body prose,
// headlines, summaries, FAQ answers, etc. The renderer (this module's caller)
// substitutes the literal token with the current value of that field from
// the platform-aggregate read at render time.
//
// Why tokens instead of literal numbers in prose:
//   - Article prose is generated once and frozen in the DB.
//   - Platform aggregates (totalBrandsTracked, totalCreativesAnalyzed, etc.)
//     drift continuously as the SpyOwl scraper detects new brands/creatives
//     and as Replit publishes new reviews.
//   - Without tokens, the body says "9,000 brands" while the JSON-LD or
//     other live surfaces say "10,432" — a same-page contradiction.
//   - Tokens decouple producer from consumer: the writer emits
//     `{{platform_stat:total_brands_tracked}}`; the renderer swaps in the
//     current value on every page render. One regex pass per render.
//
// This is the article-side parallel of `statTokens.ts` (which handles
// per-review `{{stat:*}}` tokens against `review_stats`). Different data
// source, different namespace, otherwise the same pattern.
//
// Spec:
//   {{platform_stat:total_brands_tracked}}            → "9,421"  (locale, default)
//   {{platform_stat:total_brands_tracked|raw}}        → "9421"
//   {{platform_stat:total_brands_tracked|short}}      → "9.4k"
//   {{platform_stat:total_creatives_analyzed}}        → "76,318"
//   {{platform_stat:total_creatives_analyzed|short}}  → "76k"
//   {{platform_stat:total_brands_reviewed}}           → "1,711"
//   {{platform_stat:avg_scam_score}}                  → "82"
//   {{platform_stat:top_velocity_trend}}              → "surging"
//   {{platform_stat:top_scam_brand_name}}             → "Quantum AI"
//
// Unknown keys, null aggregate fields, or null aggregates entirely all leave
// the literal token in place — intentional, so editorial review catches
// malformed references before publish rather than swallowing them silently.

export interface PlatformAggregatesForTokens {
  totalBrandsTracked: number | null;
  totalCreativesAnalyzed: number | null;
  totalBrandsWithCelebrityAbuse: number | null;
  totalBrandsReviewed: number | null;
  avgScamScore: number | null;
  topVelocityTrend: string | null;
  topScamBrandName: string | null;
  topScamBrandScore: number | null;
}

const TOKEN_RE = /\{\{platform_stat:([a-z_]+)(?:\|([a-z]+))?\}\}/gi;

const KEY_TO_FIELD: Record<string, keyof PlatformAggregatesForTokens> = {
  total_brands_tracked: "totalBrandsTracked",
  total_creatives_analyzed: "totalCreativesAnalyzed",
  total_brands_with_celebrity_abuse: "totalBrandsWithCelebrityAbuse",
  // Alias: older drafts may use `celebrities_impersonated`.
  celebrities_impersonated: "totalBrandsWithCelebrityAbuse",
  total_brands_reviewed: "totalBrandsReviewed",
  avg_scam_score: "avgScamScore",
  top_velocity_trend: "topVelocityTrend",
  top_scam_brand_name: "topScamBrandName",
  top_scam_brand_score: "topScamBrandScore",
};

function formatNumber(n: number, modifier?: string): string {
  if (modifier === "raw") return String(n);
  if (modifier === "short") {
    if (n >= 1_000_000) {
      const v = n / 1_000_000;
      return v.toFixed(v < 10 ? 1 : 0).replace(/\.0$/, "") + "M";
    }
    if (n >= 1_000) {
      const v = n / 1_000;
      return v.toFixed(v < 10 ? 1 : 0).replace(/\.0$/, "") + "k";
    }
    return String(n);
  }
  return n.toLocaleString("en-US");
}

export function substitutePlatformStatTokens(
  text: string,
  aggregates: PlatformAggregatesForTokens | null | undefined,
): string {
  if (typeof text !== "string" || text.length === 0) return text;
  if (text.indexOf("{{platform_stat:") === -1) return text;
  if (!aggregates) return text;

  return text.replace(TOKEN_RE, (match, rawKey: string, rawModifier: string | undefined) => {
    const key = (rawKey || "").toLowerCase();
    const field = KEY_TO_FIELD[key];
    if (!field) return match;
    const value = aggregates[field];
    if (value === null || value === undefined) return match;
    if (typeof value === "number") {
      return formatNumber(value, rawModifier?.toLowerCase());
    }
    return String(value);
  });
}

// Deep walk over a post-shaped object, substituting tokens in every string
// field. Preserves the input type via the generic so callers don't need a
// downstream cast. Mirrors `substituteStatTokensInReview` (statTokens.ts).
export function substitutePlatformStatTokensDeep<T>(
  value: T,
  aggregates: PlatformAggregatesForTokens | null | undefined,
): T {
  if (value == null) return value;
  if (typeof value === "string") {
    return substitutePlatformStatTokens(value, aggregates) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => substitutePlatformStatTokensDeep(item, aggregates)) as unknown as T;
  }
  if (typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    let changed = false;
    for (const k of Object.keys(src)) {
      const next = substitutePlatformStatTokensDeep(src[k], aggregates);
      if (next !== src[k]) changed = true;
      out[k] = next;
    }
    // Only allocate a new object when something actually changed; otherwise
    // return the original reference so React memoization and equality checks
    // upstream stay stable.
    return (changed ? out : value) as T;
  }
  return value;
}
