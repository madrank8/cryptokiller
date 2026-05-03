/**
 * Stat-token substitution layer
 * ============================================================
 *
 * Background — the schema-vs-body drift problem
 * ----------------------------------------------
 * Review prose (summary, methodologyText, redFlags[].description, etc.) is
 * generated ONCE by the Vercel writer pipeline at content-creation time and
 * persisted as static text in Supabase. The numerical stats (ad creative
 * count, country count, days active, celebs, weekly velocity, first/last
 * detection dates) live in `review_stats` and are kept in sync with the
 * SpyOwl scraper output continuously.
 *
 * After enough scraper sweeps, dedupe passes, and platform takedowns, the
 * stats drift away from whatever was true at write-time. The JSON-LD
 * `@graph` (`Review.reviewRating.ratingExplanation`, `Dataset.description`,
 * `Dataset.temporalCoverage`) reads `review_stats` directly — so it's
 * always live. The body prose is frozen at write-time. Result: same page
 * tells two different stories about the same campaign. Confirmed on
 * quantum-ai (2026-05-03 audit):
 *   - review_stats:    2,909 ads / 45 countries / 227 days /  56 celebs
 *   - body prose:      2,840 ads / 46 countries / 452 days / 245 celebs
 *
 * Why tokens, not regenerate-on-write
 * -----------------------------------
 * Re-running the writer on every stat update would burn LLM tokens for
 * every scraper tick on every active review (thousands of times per day
 * at scale). Tokens decouple producer (writer) from consumer (renderer):
 * the writer emits `{{stat:ad_creatives}} ads across
 * {{stat:countries_targeted}} countries`, the prose persists once, and
 * each render swaps in current values. Cost is one regex pass per render.
 *
 * Producer-side requirements (in the Vercel `crypto-killer` repo)
 * ---------------------------------------------------------------
 * Writer prompts in `lib/content-prompts.js` must emit `{{stat:KEY}}`
 * tokens instead of literal numbers when referring to:
 *   - ad creatives count        →  {{stat:ad_creatives}}
 *   - countries targeted        →  {{stat:countries_targeted}}
 *   - days active               →  {{stat:days_active}}
 *   - celebrities impersonated  →  {{stat:celebrities_abused}}
 *   - weekly ad velocity        →  {{stat:weekly_velocity}}
 *   - first detection date     →  {{stat:first_detected}} (long format)
 *                                  {{stat:first_detected|iso}} (YYYY-MM-DD)
 *   - last activity date        →  {{stat:last_active}} (long format)
 *                                  {{stat:last_active|iso}}
 *
 * Numeric tokens default to `2,909` (locale-formatted with thousands sep).
 * `|raw` modifier gives `2909`, `|short` gives `2.9k`. Date tokens default
 * to `January 8, 2025`; `|iso` gives `2025-01-08`.
 *
 * Unknown tokens or null stats leave the literal `{{stat:KEY}}` text in
 * place — it's intentional that this is visually obvious so editorial
 * review catches malformed tokens before publish. Don't silently drop.
 *
 * Backwards compatibility
 * -----------------------
 * Prose without any tokens passes through unchanged. Rolling this out
 * before the Vercel side starts emitting tokens is a no-op for users.
 */

export interface ReviewStats {
  adCreatives?: number | null;
  countriesTargeted?: number | null;
  daysActive?: number | null;
  celebritiesAbused?: number | null;
  weeklyVelocity?: number | null;
  firstDetected?: string | null;
  lastActive?: string | null;
}

const TOKEN_RE = /\{\{stat:([a-z_]+)(?:\|([a-z]+))?\}\}/g;

const NUMERIC_FIELDS: Record<string, keyof ReviewStats> = {
  ad_creatives: "adCreatives",
  countries_targeted: "countriesTargeted",
  days_active: "daysActive",
  celebrities_abused: "celebritiesAbused",
  weekly_velocity: "weeklyVelocity",
};

const DATE_FIELDS: Record<string, keyof ReviewStats> = {
  first_detected: "firstDetected",
  last_active: "lastActive",
};

function formatNumber(n: number, fmt: string | undefined): string {
  if (fmt === "raw") return String(n);
  if (fmt === "short") {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
    return String(n);
  }
  return n.toLocaleString("en-US");
}

function formatDate(s: string, fmt: string | undefined): string {
  if (!s) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  if (fmt === "iso") return d.toISOString().split("T")[0];
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Substitute `{{stat:KEY[|FMT]}}` tokens in `text` with values from `stats`.
 * Leaves unknown keys, missing fields, and null values as the literal token
 * (so editorial review can spot them). Pass-through for null/undefined input
 * and for input with no tokens.
 */
export function substituteStatTokens(
  text: string | null | undefined,
  stats: ReviewStats,
): string {
  if (text == null) return "";
  if (typeof text !== "string") return String(text);
  if (text.indexOf("{{stat:") === -1) return text;
  return text.replace(TOKEN_RE, (match, key: string, fmt?: string) => {
    if (key in NUMERIC_FIELDS) {
      const v = stats[NUMERIC_FIELDS[key]];
      if (v == null) return match;
      return formatNumber(Number(v), fmt);
    }
    if (key in DATE_FIELDS) {
      const v = stats[DATE_FIELDS[key]];
      if (!v) return match;
      return formatDate(String(v), fmt);
    }
    return match;
  });
}

/**
 * Walks every prose-bearing field on a review-shaped object and substitutes
 * stat tokens, returning a shallow-copied object with the same shape. Used
 * by both the SSR renderer (prerender.ts) and the React component
 * (ReviewPage.tsx) so the substitution rule lives in exactly one place.
 *
 * Operates on these fields when present (all string or string[]):
 *   summary, heroDescription, warningCallout, methodologyText,
 *   metaDescription, notForYou, expertiseDepth, protectionSteps, verdict,
 *   funnelStages[].{title,description,statValue,statLabel,bullets[]},
 *   redFlags[].{title,description}, faqItems[].{question,answer},
 *   keyFindings[].content
 *
 * Generic over the input shape — preserves the full type T (including
 * fields the helper doesn't touch like sources, platformName, etc.) by
 * using `unknown` indexing internally and `as T` on the result.
 */
export function substituteStatTokensInReview<T>(review: T): T {
  // Treat `review` as a loose record internally (the caller's T preserves
  // the precise type on the way out via `as T`). Fields the helper doesn't
  // touch — sources, platformName, threatScore, etc. — flow through
  // unchanged via the spread.
  const r = review as Record<string, unknown>;
  const stats: ReviewStats = {
    adCreatives: r.adCreatives as number | null | undefined,
    countriesTargeted: r.countriesTargeted as number | null | undefined,
    daysActive: r.daysActive as number | null | undefined,
    celebritiesAbused: r.celebritiesAbused as number | null | undefined,
    weeklyVelocity: r.weeklyVelocity as number | null | undefined,
    firstDetected: r.firstDetected as string | null | undefined,
    lastActive: r.lastActive as string | null | undefined,
  };
  const sub = <V>(v: V): V =>
    typeof v === "string" ? (substituteStatTokens(v, stats) as unknown as V) : v;

  type FunnelStage = {
    title?: unknown;
    description?: unknown;
    statValue?: unknown;
    statLabel?: unknown;
    bullets?: unknown;
    [k: string]: unknown;
  };
  type RedFlag = { title?: unknown; description?: unknown; [k: string]: unknown };
  type FaqItem = { question?: unknown; answer?: unknown; [k: string]: unknown };
  type KeyFinding = { content?: unknown; [k: string]: unknown };

  const out: Record<string, unknown> = { ...r };
  out.summary = sub(r.summary);
  out.heroDescription = sub(r.heroDescription);
  out.warningCallout = sub(r.warningCallout);
  out.methodologyText = sub(r.methodologyText);
  out.metaDescription = sub(r.metaDescription);
  out.notForYou = sub(r.notForYou);
  out.expertiseDepth = sub(r.expertiseDepth);
  out.protectionSteps = sub(r.protectionSteps);
  out.verdict = sub(r.verdict);

  if (Array.isArray(r.funnelStages)) {
    out.funnelStages = (r.funnelStages as FunnelStage[]).map((s) => ({
      ...s,
      title: sub(s.title),
      description: sub(s.description),
      statValue: sub(s.statValue),
      statLabel: sub(s.statLabel),
      bullets: Array.isArray(s.bullets) ? (s.bullets as unknown[]).map((b) => sub(b)) : s.bullets,
    }));
  }
  if (Array.isArray(r.redFlags)) {
    out.redFlags = (r.redFlags as RedFlag[]).map((rf) => ({
      ...rf,
      title: sub(rf.title),
      description: sub(rf.description),
    }));
  }
  if (Array.isArray(r.faqItems)) {
    out.faqItems = (r.faqItems as FaqItem[]).map((f) => ({
      ...f,
      question: sub(f.question),
      answer: sub(f.answer),
    }));
  }
  if (Array.isArray(r.keyFindings)) {
    out.keyFindings = (r.keyFindings as KeyFinding[]).map((k) => ({
      ...k,
      content: sub(k.content),
    }));
  }
  return out as T;
}
