/**
 * Standalone schema.org node for Review.itemReviewed (@id #item-reviewed).
 * Used by SSR prerender and client-side JSON-LD (usePageMeta replaces SSR
 * scripts after hydration — both paths must emit the same graph shape).
 *
 * 2026-04-28 — Schema enrichment for SoftwareApplication rich results.
 * Pre-fix: itemReviewed was emitted without sameAs (unless writer
 * explicitly supplied it), without applicationCategory, and without
 * operatingSystem. Result: SoftwareApplication-typed itemReviewed nodes
 * (the dominant case for crypto/trading-bot scams) failed Google's
 * Software rich-result eligibility checks.
 *
 * Post-fix:
 *   1. sameAs is auto-augmented with scam-infrastructure URLs harvested
 *      from row.claims[].itemReviewed.appearance — these URLs are the
 *      live presence of the scam entity on the web. sameAs tells Google
 *      "this entity exists at these URLs," which is critical for
 *      branded SERP display when someone searches the scam URL.
 *   2. SoftwareApplication-typed nodes get a sensible default
 *      applicationCategory ("FinanceApplication") + operatingSystem
 *      ("Web") when the writer hasn't supplied them.
 *   3. Original writer-supplied sameAs/applicationCategory/operatingSystem
 *      values always win — augmentation only kicks in for missing fields.
 */

import type { TierInfo } from "./reviewTier";

function truncate(s: string, max: number): string {
  const plain = s.replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1).trimEnd()}…`;
}

function clean(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

const VALID_TYPES = new Set([
  "FinancialProduct",
  "Service",
  "SoftwareApplication",
  "Organization",
]);

/**
 * Harvest scam-infrastructure URLs from the review's claims array.
 * Each ClaimReview's itemReviewed.appearance.url is the live URL where
 * the scam claim appeared (Facebook ad redirect target, fake landing
 * page, etc.). These belong on the SoftwareApplication.sameAs because
 * they ARE this entity — the same scam at multiple URLs.
 *
 * Dedupes by URL origin to avoid emitting 50 URLs that all share a host.
 * Caps at 10 entries (Google's documented sameAs limit for entity
 * recognition).
 */
function harvestSameAsFromClaims(claims: unknown): string[] {
  if (!Array.isArray(claims)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const claim of claims) {
    if (!claim || typeof claim !== "object") continue;
    const c = claim as Record<string, unknown>;
    // Writer/Vercel may store appearance as either a flat URL string,
    // a flat object with a `url` field, or as a ClaimReview-shaped
    // { itemReviewed: { appearance: { url } } }. Accept all three.
    let url: string | null = null;
    const flatAppearance = c.appearance ?? null;
    if (typeof flatAppearance === "string") {
      url = flatAppearance;
    } else if (flatAppearance && typeof flatAppearance === "object") {
      const u = (flatAppearance as Record<string, unknown>).url;
      if (typeof u === "string") url = u;
    }
    if (!url) {
      const ir = c.itemReviewed;
      if (ir && typeof ir === "object") {
        const a = (ir as Record<string, unknown>).appearance;
        if (a && typeof a === "object") {
          const u = (a as Record<string, unknown>).url;
          if (typeof u === "string") url = u;
        } else if (typeof a === "string") {
          url = a;
        }
      }
    }
    if (!url || !url.startsWith("http")) continue;
    // Dedupe by origin (host + protocol) so we get one entry per scam
    // domain rather than per ad creative. Google reads sameAs as
    // "entity exists at this URL" — host-level dedup is what matters.
    let origin: string;
    try {
      origin = new URL(url).origin;
    } catch {
      continue;
    }
    if (seen.has(origin)) continue;
    seen.add(origin);
    // Use the origin (clean root URL) rather than the full ad-redirect URL
    // to keep sameAs canonical. The ad redirect is transient; the host is
    // the entity anchor.
    out.push(`${origin}/`);
    if (out.length >= 10) break;
  }
  return out;
}

/** Default applicationCategory for SoftwareApplication-typed item. */
function defaultApplicationCategory(platformName: string): string {
  // Most CryptoKiller-tracked SoftwareApplication subjects are "trading
  // bot" / "investment automation" / "crypto signals" — all in the
  // FinanceApplication family per Google's documented enum. Fall back
  // to BusinessApplication only if the platform name strongly signals
  // a non-finance domain (rare in our archive).
  const lc = platformName.toLowerCase();
  if (/(?:dating|romance|chat|social)/.test(lc)) return "SocialNetworkingApplication";
  if (/(?:health|medical|pharma)/.test(lc)) return "HealthApplication";
  return "FinanceApplication";
}

export function buildItemReviewedJsonLdNode(
  rawItemReviewed: unknown,
  canonical: string,
  platformName: string,
  row: {
    heroDescription?: string | null;
    summary?: string | null;
    threatScore?: number | null;
    claims?: unknown;
  },
  tier: TierInfo,
): Record<string, unknown> | null {
  const input = rawItemReviewed && typeof rawItemReviewed === "object"
    ? (rawItemReviewed as Record<string, unknown>)
    : null;

  const rawType = input?.type;
  const type = typeof rawType === "string" && VALID_TYPES.has(rawType)
    ? rawType
    : "Service";

  const rawName = typeof input?.name === "string" ? input.name.trim() : "";
  const name = rawName || platformName;
  if (!name) return null;

  const rawDesc = typeof input?.description === "string" ? input.description.trim() : "";
  const description = rawDesc
    ? rawDesc
    : (row.heroDescription || row.summary
        ? truncate(clean(row.heroDescription || row.summary), 250)
        : `Platform under investigation by CryptoKiller. Threat score ${row.threatScore ?? "?"}/100 (${tier.label}).`);

  const url = typeof input?.url === "string" && (input.url as string).startsWith("http")
    ? (input.url as string)
    : undefined;

  const alternateName = Array.isArray(input?.alternateName) && input.alternateName.length
    ? (input.alternateName as unknown[]).filter((v): v is string => typeof v === "string")
    : undefined;

  // sameAs — preserve writer-supplied entries, augment with claim
  // appearance URLs harvested from the row's ClaimReview array. Dedupe
  // by URL string so we don't double-list a host the writer already
  // included.
  const writerSameAs = Array.isArray(input?.sameAs) && input.sameAs.length
    ? (input.sameAs as unknown[]).filter((v): v is string => typeof v === "string" && v.startsWith("http"))
    : [];
  const harvestedSameAs = harvestSameAsFromClaims(row.claims);
  const sameAsSet = new Set<string>([...writerSameAs, ...harvestedSameAs]);
  const sameAs = sameAsSet.size > 0 ? [...sameAsSet] : undefined;

  // SoftwareApplication-only fields. Required by Google for the
  // Software rich result; pre-2026-04-28 these were silently omitted
  // so SoftwareApplication-typed itemReviewed nodes never qualified.
  const softwareFields: Record<string, unknown> = {};
  if (type === "SoftwareApplication") {
    const writerCategory = typeof input?.applicationCategory === "string"
      ? (input.applicationCategory as string).trim()
      : "";
    const writerOs = typeof input?.operatingSystem === "string"
      ? (input.operatingSystem as string).trim()
      : "";
    softwareFields.applicationCategory = writerCategory || defaultApplicationCategory(platformName);
    softwareFields.operatingSystem = writerOs || "Web";
  }

  return {
    "@type": type,
    "@id": `${canonical}#item-reviewed`,
    name,
    description,
    ...(url ? { url } : {}),
    ...(alternateName && alternateName.length ? { alternateName } : {}),
    ...(sameAs && sameAs.length ? { sameAs } : {}),
    ...softwareFields,
    subjectOf: { "@id": `${canonical}#review` },
  };
}
