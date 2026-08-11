// ─── Ad-evidence JSON-LD builder (single source of truth) ───────────────────
//
// Builds the machine-readable counterpart of the "Ads scraped this week" grid:
// one schema.org CreativeWork node per scraped ad creative, plus the Review
// node's `hasPart` reference list. Used by BOTH render paths:
//
//   - SSR: server/prerender.ts (first-byte HTML JSON-LD)
//   - CSR: src/pages/ReviewPage.tsx (usePageMeta strips the SSR JSON-LD on
//     hydration and replaces it with the client-built graph)
//
// Because both sides call this one function, the node shape can never drift.
// Snapshot lockstep (which ADS are in the list) is handled separately: the
// SSR server embeds its recent-ads snapshot as
// `<script type="application/json" id="ssr-recent-ads" data-slug="...">` and
// the client prefers that snapshot over the API's copy (see
// readSsrRecentAdsSnapshot in ReviewPage.tsx), so a crawler executing JS sees
// exactly the ads that were in the first-byte HTML.
//
// CTA safety policy (docs/REPLIT_ADS_CTA_SAFETY_HANDOFF): the ONLY url ever
// emitted is the already-filtered Facebook post permalink (postUrl) — never a
// landing URL; linkDomain is deliberately absent here. schema.org has no
// Advertisement type, so CreativeWork + genre is the honest fit. Only
// observed fields are emitted; nothing is fabricated.
//
// @id is keyed by the stable Supabase creative UUID (not list position) so a
// fragment always denotes the same creative.

/** Structural subset of RecentAd needed to build the JSON-LD nodes. */
export interface AdEvidenceAd {
  id: string;
  offer: string;
  celebrity?: string | null;
  geo: string;
  language?: string | null;
  isVideo: boolean;
  lastSeenAt: string;
  scrapeCount: number;
  /** CTA-safety-filtered Facebook post permalink; the only url emitted. */
  postUrl?: string | null;
  adCopy?: string | null;
}

// Defense in depth at the JSON-LD emission boundary: even though upstream
// normalizers already restrict postUrl to clean https facebook.com hosts,
// re-validate here so no future upstream regression can leak a landing URL
// into structured data.
const FORBIDDEN_CTA_PATTERN = /\/click(?:[/?#]|$)|fbclid|token_fb|pixel_fb/i;

function safeEvidenceUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (host !== "facebook.com" && !host.endsWith(".facebook.com")) return null;
    if (FORBIDDEN_CTA_PATTERN.test(u.toString())) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export interface AdEvidenceGraph {
  /** Value for the Review node's `hasPart` — one @id ref per creative. */
  hasPart: Array<{ "@id": string }>;
  /** Sibling CreativeWork nodes to push onto the @graph. */
  nodes: Array<Record<string, unknown>>;
}

/**
 * @param pageUrl canonical page URL (no fragment) — @id fragments hang off it
 * @param ads the recent-ads snapshot for this render
 * @param hasItemReviewed whether the graph contains a `#item-reviewed` node
 */
export function buildAdEvidenceGraph(
  pageUrl: string,
  ads: readonly AdEvidenceAd[],
  hasItemReviewed: boolean,
): AdEvidenceGraph {
  const hasPart = ads.map((ad) => ({ "@id": `${pageUrl}#ad-evidence-${ad.id}` }));
  const nodes = ads.map((ad) => {
    const celebrities = (ad.celebrity ?? "")
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    const url = safeEvidenceUrl(ad.postUrl);
    return {
      "@type": "CreativeWork",
      "@id": `${pageUrl}#ad-evidence-${ad.id}`,
      name: `Scam ad creative: ${ad.offer}`,
      genre: ad.isVideo
        ? "Paid social media video advertisement"
        : "Paid social media advertisement",
      description: `Fraudulent ad creative promoting "${ad.offer}", observed by CryptoKiller scrapers targeting ${ad.geo}${ad.scrapeCount ? ` (seen ${ad.scrapeCount}×)` : ""}.`,
      isPartOf: { "@id": `${pageUrl}#review` },
      ...(hasItemReviewed ? { about: { "@id": `${pageUrl}#item-reviewed` } } : {}),
      ...(ad.adCopy ? { text: ad.adCopy } : {}),
      ...(ad.language ? { inLanguage: ad.language } : {}),
      contentLocation: { "@type": "Country", name: ad.geo },
      // lastSeenAt = most recent scraper observation of the live creative.
      ...(ad.lastSeenAt ? { dateModified: ad.lastSeenAt } : {}),
      ...(url ? { url } : {}),
      ...(celebrities.length
        ? { mentions: celebrities.map((n) => ({ "@type": "Person", name: n })) }
        : {}),
    };
  });
  return { hasPart, nodes };
}
