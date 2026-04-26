/**
 * Standalone schema.org node for Review.itemReviewed (@id #item-reviewed).
 * Used by SSR prerender and client-side JSON-LD (usePageMeta replaces SSR
 * scripts after hydration — both paths must emit the same graph shape).
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
 * Build the Review's itemReviewed entity as a full @graph node.
 * Whitelist: FinancialProduct | Service | SoftwareApplication | Organization.
 * Fallback type is Service — never Thing (invalid for Review rich results).
 */
export function buildItemReviewedJsonLdNode(
  rawItemReviewed: unknown,
  canonical: string,
  platformName: string,
  row: { heroDescription?: string | null; summary?: string | null; threatScore?: number | null },
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

  const sameAs = Array.isArray(input?.sameAs) && input.sameAs.length
    ? (input.sameAs as unknown[]).filter((v): v is string => typeof v === "string" && v.startsWith("http"))
    : undefined;

  return {
    "@type": type,
    "@id": `${canonical}#item-reviewed`,
    name,
    description,
    ...(url ? { url } : {}),
    ...(alternateName && alternateName.length ? { alternateName } : {}),
    ...(sameAs && sameAs.length ? { sameAs } : {}),
    subjectOf: { "@id": `${canonical}#review` },
  };
}
