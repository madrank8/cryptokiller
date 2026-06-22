import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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

// See artifacts/api-server/src/lib/supabase-recent-ads.ts for rationale.
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
    console.warn("[supabase-recent-ads] creatives query failed", brand, error.message);
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
    console.warn("[supabase-recent-ads] text query failed", error.message);
    return new Map();
  }
  return new Map(((data ?? []) as CreativeTextRow[]).map((r) => [r.id, r]));
}

function toRecentAd(c: CreativeRow, text: CreativeTextRow | undefined): RecentAd | null {
  const offer = c.normalized_offer?.trim() ?? "";
  const geo = (c.geo ?? "").trim().toUpperCase();
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
 * SSR mirror of artifacts/api-server/src/lib/supabase-recent-ads.ts — runs in
 * the crypto-review server process so the prerender HTML contains the same
 * recentAds the React component sees on hydration. Keep these two
 * implementations in lockstep when the shape changes.
 */
export async function getRecentAdsForBrand(brandName: string | null | undefined): Promise<RecentAd[]> {
  const name = brandName?.trim();
  if (!name || !supabase) return [];
  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  let creatives = await fetchCreatives(name, true);
  if (creatives.length === 0) creatives = await fetchCreatives(name, false);

  const textMap = await fetchText(creatives.map((c) => c.id));
  const ads = creatives
    .map((c) => toRecentAd(c, textMap.get(c.id)))
    .filter((a): a is RecentAd => a !== null);

  cache.set(key, { data: ads, expiresAt: Date.now() + CACHE_TTL_MS });
  return ads;
}
