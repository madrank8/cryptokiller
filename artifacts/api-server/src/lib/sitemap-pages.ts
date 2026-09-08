import { INVESTIGATIONS_ITEMS_PER_PAGE } from "@workspace/site-content";

export { INVESTIGATIONS_ITEMS_PER_PAGE };

export interface SitemapPage {
  loc: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}

export interface SitemapAlternate {
  hreflang: string;
  href: string;
}

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  alternates?: readonly SitemapAlternate[];
}

export interface SitemapIndexEntry {
  loc: string;
  lastmod?: string;
}

export const SITEMAP_URL_LIMIT = 5_000;
export const SITEMAP_CACHE_CONTROL = "public, max-age=0, s-maxage=3600";

type DateValue = Date | string | null | undefined;

export interface SitemapHubLastmods {
  homepageLastmod?: string;
  investigationsLastmod?: string;
  blogLastmod?: string;
}

/**
 * Literal, indexable routes declared by the frontend router.
 *
 * Parameterized review/blog/author routes are emitted from published data and
 * intentionally do not belong here. Keeping this registry beside the sitemap
 * renderer gives validation a pure source of truth without importing the
 * database-backed reviews router.
 */
export const STATIC_SITEMAP_PAGE_DEFINITIONS = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/investigations", changefreq: "daily", priority: "0.9" },
  { loc: "/blog", changefreq: "daily", priority: "0.8" },
  { loc: "/methodology", changefreq: "monthly", priority: "0.8" },
  { loc: "/report", changefreq: "monthly", priority: "0.7" },
  { loc: "/about", changefreq: "monthly", priority: "0.6" },
  { loc: "/recovery", changefreq: "monthly", priority: "0.7" },
  { loc: "/privacy", changefreq: "yearly", priority: "0.3" },
  { loc: "/terms", changefreq: "yearly", priority: "0.3" },
  { loc: "/ai-disclosure", changefreq: "yearly", priority: "0.3" },
] as const satisfies readonly SitemapPage[];

export const STATIC_SITEMAP_PATHS = STATIC_SITEMAP_PAGE_DEFINITIONS.map(
  ({ loc }) => loc,
);

export function buildStaticSitemapPages(
  lastmods: SitemapHubLastmods,
): SitemapPage[] {
  return STATIC_SITEMAP_PAGE_DEFINITIONS.map((definition) => {
    const lastmod =
      definition.loc === "/"
        ? lastmods.homepageLastmod
        : definition.loc === "/investigations"
          ? lastmods.investigationsLastmod
          : definition.loc === "/blog"
            ? lastmods.blogLastmod
            : undefined;
    return lastmod ? { ...definition, lastmod } : { ...definition };
  });
}

export function sitemapShardCount(
  itemCount: number,
  includeEmptyShard = false,
): number {
  if (!Number.isSafeInteger(itemCount) || itemCount < 0) {
    throw new Error(`Invalid sitemap item count: ${itemCount}`);
  }
  if (itemCount === 0) return includeEmptyShard ? 1 : 0;
  return Math.ceil(itemCount / SITEMAP_URL_LIMIT);
}

export function sitemapShardNumbers(
  itemCount: number,
  includeEmptyShard = false,
): number[] {
  return Array.from(
    { length: sitemapShardCount(itemCount, includeEmptyShard) },
    (_, index) => index + 1,
  );
}

export function sitemapShardOffset(shardNumber: number): number {
  if (!Number.isSafeInteger(shardNumber) || shardNumber < 1) {
    throw new Error(`Invalid sitemap shard number: ${shardNumber}`);
  }
  const offset = (shardNumber - 1) * SITEMAP_URL_LIMIT;
  if (!Number.isSafeInteger(offset)) {
    throw new Error(`Sitemap shard offset is too large: ${shardNumber}`);
  }
  return offset;
}

function toDateOnly(value: DateValue): string | undefined {
  return value ? new Date(value).toISOString().split("T")[0] : undefined;
}

/**
 * Map each dynamic hub only to content rendered on that URL.
 *
 * The blog renders every published post, so its latest post update is a
 * defensible page-level signal. Homepage and investigations render
 * sorted/truncated review views and derived aggregates; a global review update
 * cannot prove either URL changed, so both intentionally omit lastmod.
 */
export function buildSitemapHubLastmods({
  latestReviewDate: _latestReviewDate,
  latestBlogDate,
}: {
  latestReviewDate: DateValue;
  latestBlogDate: DateValue;
}): SitemapHubLastmods {
  return {
    blogLastmod: toDateOnly(latestBlogDate),
  };
}

/**
 * Paginated investigation slices do not have reliable revision timestamps.
 *
 * The public list is sorted by threat score, so an updated review can move
 * between slices and change pages it no longer belongs to. Without persisted
 * page-revision history, omitting lastmod is the only accurate representation.
 */
export function buildInvestigationPaginationPages(reviewCount: number): SitemapPage[] {
  const pageCount = Math.max(
    1,
    Math.ceil(reviewCount / INVESTIGATIONS_ITEMS_PER_PAGE),
  );

  return Array.from({ length: pageCount - 1 }, (_, index) => ({
    loc: `/investigations?page=${index + 2}`,
    changefreq: "daily",
    priority: "0.7",
  }));
}

export function renderSitemapPage(base: string, page: SitemapPage): string {
  return renderSitemapUrl({
    loc: `${base}${page.loc}`,
    ...(page.lastmod ? { lastmod: page.lastmod } : {}),
    changefreq: page.changefreq,
    priority: page.priority,
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlUrl(url: string): string {
  return escapeXml(encodeURI(url));
}

export function renderSitemapUrl(entry: SitemapUrlEntry): string {
  let xml = `  <url>\n    <loc>${xmlUrl(entry.loc)}</loc>\n`;
  if (entry.lastmod) xml += `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n`;
  if (entry.changefreq) {
    xml += `    <changefreq>${escapeXml(entry.changefreq)}</changefreq>\n`;
  }
  if (entry.priority) {
    xml += `    <priority>${escapeXml(entry.priority)}</priority>\n`;
  }
  for (const alternate of entry.alternates ?? []) {
    xml += `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${xmlUrl(alternate.href)}"/>\n`;
  }
  xml += "  </url>\n";
  return xml;
}

export function renderSitemapUrlSet(
  entries: readonly SitemapUrlEntry[],
): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.map(renderSitemapUrl),
    "</urlset>",
  ].join("\n");
}

export function renderSitemapIndex(
  entries: readonly SitemapIndexEntry[],
): string {
  const children = entries.map((entry) => {
    let xml = `  <sitemap>\n    <loc>${xmlUrl(entry.loc)}</loc>\n`;
    if (entry.lastmod) {
      xml += `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n`;
    }
    return `${xml}  </sitemap>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...children,
    "</sitemapindex>",
  ].join("\n");
}