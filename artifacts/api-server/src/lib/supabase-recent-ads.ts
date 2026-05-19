import { supabase } from "./supabase";
import { logger } from "./logger";

export interface RecentAd {
  id: string;
  offer: string;
  celebrity: string | null;
  geo: string;
  language: string | null;
  isVideo: boolean;
  lastSeenAt: string;
  scrapeCount: number;
  linkUrl: string | null;
  postUrl: string | null;
  adCopy: string | null;
}

interface CacheEntry {
  data: RecentAd[];
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const LIMIT = 4;

interface CreativeRow {
  id: string;
  normalized_offer: string | null;
  celebrity_name: string | null;
  geo: string | null;
  land_language: string | null;
  is_video: boolean | null;
  last_seen_at: string | null;
  scrape_count: number | null;
}

interface CreativeTextRow {
  id: string;
  link_url: string | null;
  post_url: string | null;
  main_text: string | null;
}

// Escape characters with meaning in (a) the PostgREST .or() grammar -- ,()
// -- and (b) the LIKE/ILIKE pattern language itself -- backslash, %, _, *.
// Without the pattern-level escape, a brand string containing '%' or '_'
// would silently broaden the match (e.g. brand 'A_B' would match 'AXB');
// without the grammar-level escape, a ',' or ')' would terminate the or()
// expression early. Belt-and-braces; brand names today are simple but the
// upstream isn't ours to police.
function escapeIlikePattern(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*");
}

function escapeOrGrammar(s: string): string {
  return s.replace(/,/g, "\\,").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildOrFilter(brand: string): string {
  const safe = escapeOrGrammar(escapeIlikePattern(brand));
  // Two ilike branches model `LOWER(SPLIT_PART(normalized_offer,' ',1)) = LOWER(brand)`:
  //   1. exact brand (no trailing tokens)
  //   2. brand followed by a space + anything (first token == brand)
  // Won't match 'Krysenvoxen' or 'CalvenRidge SenvixTrust' for brand 'Senvix'.
  return `normalized_offer.ilike.${safe},normalized_offer.ilike.${safe} *`;
}

async function fetchCreatives(brand: string, withinSevenDays: boolean): Promise<CreativeRow[]> {
  if (!supabase) return [];
  let q = supabase
    .from("creatives")
    .select("id, normalized_offer, celebrity_name, geo, land_language, is_video, last_seen_at, scrape_count")
    .or(buildOrFilter(brand))
    .order("last_seen_at", { ascending: false })
    .order("scrape_count", { ascending: false, nullsFirst: false })
    .limit(LIMIT);
  if (withinSevenDays) {
    q = q.gte("last_seen_at", new Date(Date.now() - SEVEN_DAYS_MS).toISOString());
  }
  const { data, error } = await q;
  if (error) {
    logger.warn({ err: error.message, brand }, "supabase recent-ads creatives query failed");
    return [];
  }
  return (data ?? []) as CreativeRow[];
}

async function fetchText(ids: string[]): Promise<Map<string, CreativeTextRow>> {
  if (!supabase || ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from("creatives_with_text")
    .select("id, link_url, post_url, main_text")
    .in("id", ids);
  if (error) {
    logger.warn({ err: error.message, ids }, "supabase recent-ads text query failed");
    return new Map();
  }
  return new Map(((data ?? []) as CreativeTextRow[]).map((r) => [r.id, r]));
}

function toRecentAd(c: CreativeRow, text: CreativeTextRow | undefined): RecentAd | null {
  const offer = c.normalized_offer?.trim() ?? "";
  const geo = (c.geo ?? "").trim().toUpperCase();
  // Schema marks geo required (non-null, non-empty ISO-3166-1 alpha-2). Drop
  // creatives that don't satisfy that contract instead of emitting "" — keeps
  // the API response valid against the generated Zod schema and avoids the
  // client having to special-case empty-string geo.
  if (!offer || !c.last_seen_at || !/^[A-Z]{2}$/.test(geo)) return null;
  return {
    id: c.id,
    offer,
    celebrity: c.celebrity_name?.trim() || null,
    geo,
    language: c.land_language?.trim() || null,
    isVideo: Boolean(c.is_video),
    lastSeenAt: new Date(c.last_seen_at).toISOString(),
    scrapeCount: typeof c.scrape_count === "number" ? c.scrape_count : 0,
    linkUrl: text?.link_url?.trim() || null,
    postUrl: text?.post_url?.trim() || null,
    adCopy: text?.main_text?.trim() || null,
  };
}

/**
 * Live-derive up to 4 recent CryptoKiller ad creatives for a brand, by querying the
 * Supabase `creatives` table (joined with `creatives_with_text`) keyed off the
 * first token of `normalized_offer` (case-insensitive) against `brandName`.
 *
 * Matches `'Senvix'` and `'Senvix Cristiano Ronaldo'`, but NOT
 * `'CalvenRidge SenvixTrust'` or `'Krysenvoxen'` — exact first-token only.
 *
 * - 5-minute in-memory cache per brandName.
 * - Primary window: last 7 days. Fallback: no date filter (still LIMIT 4).
 * - Returns [] when Supabase is unconfigured, on error, or no matches exist.
 */
export async function getRecentAdsForBrand(brandName: string | null | undefined): Promise<RecentAd[]> {
  const name = brandName?.trim();
  if (!name) return [];
  if (!supabase) return [];

  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let creatives = await fetchCreatives(name, true);
  if (creatives.length === 0) {
    creatives = await fetchCreatives(name, false);
  }

  const textMap = await fetchText(creatives.map((c) => c.id));
  const ads = creatives
    .map((c) => toRecentAd(c, textMap.get(c.id)))
    .filter((a): a is RecentAd => a !== null);

  cache.set(key, { data: ads, expiresAt: Date.now() + CACHE_TTL_MS });
  return ads;
}
