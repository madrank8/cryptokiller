export interface SitemapPage {
  loc: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}

export const INVESTIGATIONS_ITEMS_PER_PAGE = 20;

type DateValue = Date | string | null | undefined;

export interface SitemapHubLastmods {
  homepageLastmod?: string;
  investigationsLastmod?: string;
  blogLastmod?: string;
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
  let xml = `  <url>\n    <loc>${base}${page.loc}</loc>\n`;
  if (page.lastmod) {
    xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
  }
  xml += `    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
  return xml;
}