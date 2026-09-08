import assert from "node:assert/strict";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  blogPostsTable,
  db,
  reviewsTable,
  reviewTranslationsTable,
} from "@workspace/db";
import { LOCALE_HREFLANG } from "@workspace/i18n";
import { AUTHOR_PROFILE_SLUGS } from "@workspace/site-content";
import {
  HOST,
  LOCALE_URL_SEGMENT,
  blogUrl,
  reviewLocaleUrl,
  reviewUrl,
} from "../src/canonical-urls.ts";
import {
  SITEMAP_CACHE_CONTROL,
  SITEMAP_URL_LIMIT,
  buildInvestigationPaginationPages,
  buildSitemapHubLastmods,
  buildStaticSitemapPages,
  sitemapShardNumbers,
} from "../src/lib/sitemap-pages.ts";

const API_BASE_URL = (
  process.env.VERIFY_API_BASE_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");
const WEB_BASE_URL = (
  process.env.VERIFY_BASE_URL ?? "http://localhost:5173"
).replace(/\/+$/, "");
const SUPPORTED_LOCALES = Object.keys(LOCALE_URL_SEGMENT);

interface ParsedAlternate {
  hreflang: string;
  href: string;
}

interface ParsedEntry {
  loc: string;
  lastmod?: string;
  alternates: ParsedAlternate[];
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseAttribute(tag: string, name: string): string | undefined {
  const match = tag.match(
    new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, "i"),
  );
  return match?.[1] ?? match?.[2];
}

function parseIndex(xml: string): string[] {
  const root = xml.match(
    /^\s*<\?xml\b[\s\S]*?\?>\s*<sitemapindex\b[^>]*>([\s\S]*)<\/sitemapindex>\s*$/i,
  );
  assert.ok(root, "root sitemap must contain exactly one sitemapindex");
  assert.doesNotMatch(root[1], /<url\b/i, "sitemap index must not contain URL entries");
  const pattern = /<sitemap\b[^>]*>[\s\S]*?<\/sitemap>/gi;
  const blocks = Array.from(root[1].matchAll(pattern), (match) => match[0]);
  assert.ok(blocks.length > 0, "sitemap index must contain child sitemaps");
  assert.equal(
    root[1].replace(pattern, "").trim(),
    "",
    "sitemap index contains content outside sitemap children",
  );
  return blocks.map((block, index) => {
    assert.doesNotMatch(
      block,
      /<lastmod>/i,
      `sitemap index child ${index + 1} must omit speculative lastmod`,
    );
    const locs = Array.from(
      block.matchAll(/<loc>([^<]+)<\/loc>/gi),
      (match) => decodeXml(match[1].trim()),
    );
    assert.equal(locs.length, 1, `sitemap index child ${index + 1} needs one loc`);
    return locs[0];
  });
}

function parseUrlSet(xml: string): ParsedEntry[] {
  const root = xml.match(
    /^\s*<\?xml\b[\s\S]*?\?>\s*<urlset\b[^>]*>([\s\S]*)<\/urlset>\s*$/i,
  );
  assert.ok(root, "sitemap child must contain exactly one urlset");
  assert.doesNotMatch(root[1], /<sitemap\b/i, "urlset must not contain sitemap children");
  const pattern = /<url\b[^>]*>[\s\S]*?<\/url>/gi;
  const blocks = Array.from(root[1].matchAll(pattern), (match) => match[0]);
  assert.equal(
    root[1].replace(pattern, "").trim(),
    "",
    "urlset contains content outside URL entries",
  );
  return blocks.map((block, index) => {
    const locs = Array.from(
      block.matchAll(/<loc>([^<]+)<\/loc>/gi),
      (match) => decodeXml(match[1].trim()),
    );
    assert.equal(locs.length, 1, `URL entry ${index + 1} needs exactly one loc`);
    const lastmods = Array.from(
      block.matchAll(/<lastmod>([^<]+)<\/lastmod>/gi),
      (match) => decodeXml(match[1].trim()),
    );
    assert.ok(lastmods.length <= 1, `URL entry ${index + 1} has duplicate lastmod`);
    const alternates = Array.from(
      block.matchAll(/<xhtml:link\b[^>]*\/?>/gi),
      (match) => ({
        hreflang: decodeXml(parseAttribute(match[0], "hreflang") ?? ""),
        href: decodeXml(parseAttribute(match[0], "href") ?? ""),
      }),
    );
    assert.ok(
      alternates.every((alternate) => alternate.hreflang && alternate.href),
      `URL entry ${index + 1} has a malformed alternate link`,
    );
    return {
      loc: locs[0],
      ...(lastmods[0] ? { lastmod: lastmods[0] } : {}),
      alternates,
    };
  });
}

function dateOnly(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function chunks<T>(rows: readonly T[], includeEmpty: boolean): T[][] {
  return sitemapShardNumbers(rows.length, includeEmpty).map((shard) =>
    rows.slice(
      (shard - 1) * SITEMAP_URL_LIMIT,
      shard * SITEMAP_URL_LIMIT,
    ),
  );
}

async function fetchXml(pathname: string): Promise<{
  response: Response;
  body: string;
}> {
  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    redirect: "manual",
    headers: { Accept: "application/xml" },
    signal: AbortSignal.timeout(15_000),
  });
  return { response, body: await response.text() };
}

function assertSitemapResponse(pathname: string, response: Response): void {
  assert.equal(response.status, 200, `${pathname} must return direct HTTP 200`);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^(?:application|text)\/xml\b/i,
    `${pathname} must return XML`,
  );
  assert.equal(
    response.headers.get("cache-control"),
    SITEMAP_CACHE_CONTROL,
    `${pathname} must use the shared one-hour sitemap cache policy`,
  );
  assert.doesNotMatch(
    response.headers.get("cache-control") ?? "",
    /immutable/i,
    `${pathname} must remain revalidatable`,
  );
}

async function assertRedirect(
  url: string,
  expectedLocation: string,
): Promise<void> {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.status, 301, `${url} must return HTTP 301`);
  assert.equal(
    response.headers.get("location"),
    expectedLocation,
    `${url} must redirect to the canonical sitemap index`,
  );
}

async function main(): Promise<void> {
  const [reviewRows, blogRows, translationRows] = await Promise.all([
    db
      .select({
        id: reviewsTable.id,
        slug: reviewsTable.slug,
        updatedAt: reviewsTable.updatedAt,
      })
      .from(reviewsTable)
      .where(eq(reviewsTable.status, "published"))
      .orderBy(asc(reviewsTable.id), asc(reviewsTable.slug)),
    db
      .select({
        id: blogPostsTable.id,
        slug: blogPostsTable.slug,
        updatedAt: blogPostsTable.updatedAt,
      })
      .from(blogPostsTable)
      .where(eq(blogPostsTable.status, "published"))
      .orderBy(asc(blogPostsTable.id), asc(blogPostsTable.slug)),
    db
      .select({
        reviewId: reviewTranslationsTable.reviewId,
        masterSlug: reviewsTable.slug,
        locale: reviewTranslationsTable.locale,
        slug: reviewTranslationsTable.slug,
        updatedAt: reviewTranslationsTable.updatedAt,
      })
      .from(reviewTranslationsTable)
      .innerJoin(
        reviewsTable,
        eq(reviewTranslationsTable.reviewId, reviewsTable.id),
      )
      .where(
        and(
          eq(reviewTranslationsTable.status, "published"),
          eq(reviewsTable.status, "published"),
          inArray(reviewTranslationsTable.locale, SUPPORTED_LOCALES),
        ),
      )
      .orderBy(
        asc(reviewTranslationsTable.locale),
        asc(reviewTranslationsTable.reviewId),
        asc(reviewTranslationsTable.slug),
      ),
  ]);

  const expectedByChild = new Map<string, ParsedEntry[]>();
  const latestBlogDate =
    blogRows.length === 0
      ? undefined
      : blogRows.reduce((latest, row) =>
          row.updatedAt > latest ? row.updatedAt : latest,
        blogRows[0].updatedAt);
  const hubLastmods = buildSitemapHubLastmods({
    latestReviewDate: undefined,
    latestBlogDate,
  });
  expectedByChild.set(
    "/api/sitemaps/core.xml",
    [
      ...buildStaticSitemapPages(hubLastmods).map((page) => ({
        loc: `${HOST}${page.loc}`,
        ...(page.lastmod ? { lastmod: page.lastmod } : {}),
        alternates: [],
      })),
      ...AUTHOR_PROFILE_SLUGS.map((slug) => ({
        loc: `${HOST}/author/${slug}`,
        alternates: [],
      })),
      ...buildInvestigationPaginationPages(reviewRows.length).map((page) => ({
        loc: `${HOST}${page.loc}`,
        alternates: [],
      })),
    ],
  );

  for (const [index, shard] of chunks(blogRows, true).entries()) {
    expectedByChild.set(
      `/api/sitemaps/blog/${index + 1}.xml`,
      shard.map((row) => ({
        loc: blogUrl(row.slug),
        lastmod: dateOnly(row.updatedAt),
        alternates: [],
      })),
    );
  }

  const translationsForReview = new Map<
    number,
    Array<(typeof translationRows)[number]>
  >();
  for (const row of translationRows) {
    const siblings = translationsForReview.get(row.reviewId) ?? [];
    siblings.push(row);
    translationsForReview.set(row.reviewId, siblings);
  }
  const expectedAlternates = (
    reviewId: number,
    masterSlug: string,
  ): ParsedAlternate[] => {
    const siblings = translationsForReview.get(reviewId) ?? [];
    if (siblings.length === 0) return [];
    const master = reviewUrl(masterSlug);
    return [
      { hreflang: "en", href: master },
      ...siblings.map((row) => ({
        hreflang: LOCALE_HREFLANG[row.locale],
        href: reviewLocaleUrl(row.locale, row.slug)!,
      })),
      { hreflang: "x-default", href: master },
    ];
  };

  for (const [index, shard] of chunks(reviewRows, true).entries()) {
    expectedByChild.set(
      `/api/sitemaps/reviews/${index + 1}.xml`,
      shard.map((row) => ({
        loc: reviewUrl(row.slug),
        lastmod: dateOnly(row.updatedAt),
        alternates: expectedAlternates(row.id, row.slug),
      })),
    );
  }

  for (const locale of SUPPORTED_LOCALES) {
    const localeRows = translationRows
      .filter((row) => row.locale === locale)
      .sort(
        (a, b) =>
          a.reviewId - b.reviewId || a.slug.localeCompare(b.slug),
      );
    const segment = LOCALE_URL_SEGMENT[locale];
    for (const [index, shard] of chunks(localeRows, false).entries()) {
      expectedByChild.set(
        `/api/sitemaps/locales/${segment}/${index + 1}.xml`,
        shard.map((row) => ({
          loc: reviewLocaleUrl(row.locale, row.slug)!,
          lastmod: dateOnly(row.updatedAt),
          alternates: expectedAlternates(row.reviewId, row.masterSlug),
        })),
      );
    }
  }

  const { response: indexResponse, body: indexXml } = await fetchXml(
    "/api/sitemap.xml",
  );
  assertSitemapResponse("/api/sitemap.xml", indexResponse);
  const indexLocations = parseIndex(indexXml);
  assert.equal(
    new Set(indexLocations).size,
    indexLocations.length,
    "sitemap index child locations must be unique",
  );
  const expectedChildPaths = [...expectedByChild.keys()];
  const actualChildPaths = indexLocations.map((location) => {
    const url = new URL(location);
    assert.equal(url.origin, HOST, `${location} must use the canonical origin`);
    assert.equal(url.search, "", `${location} must not contain a query`);
    return url.pathname;
  });
  assert.deepEqual(
    actualChildPaths,
    expectedChildPaths,
    "sitemap index membership and deterministic child order drifted",
  );

  const actualEntries: ParsedEntry[] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const childPath of actualChildPaths) {
    const { response, body } = await fetchXml(childPath);
    assertSitemapResponse(childPath, response);
    const entries = parseUrlSet(body);
    assert.ok(
      entries.length <= SITEMAP_URL_LIMIT,
      `${childPath} exceeds the 5,000 URL child limit`,
    );
    const expectedEntries = expectedByChild.get(childPath)!;
    assert.deepEqual(
      entries,
      expectedEntries,
      `${childPath} does not match published database/registry truth`,
    );
    for (const entry of entries) {
      assert.equal(
        new URL(entry.loc).origin,
        HOST,
        `${entry.loc} must use the canonical origin`,
      );
      if (entry.lastmod) {
        assert.match(entry.lastmod, /^\d{4}-\d{2}-\d{2}$/);
        assert.ok(
          entry.lastmod <= today,
          `${entry.loc} has future lastmod ${entry.lastmod}`,
        );
      }
    }
    actualEntries.push(...entries);
  }

  const actualLocations = actualEntries.map((entry) => entry.loc);
  assert.equal(
    new Set(actualLocations).size,
    actualLocations.length,
    "flattened sitemap must contain every canonical URL only once",
  );
  const expectedLocations = [...expectedByChild.values()]
    .flat()
    .map((entry) => entry.loc);
  assert.deepEqual(
    actualLocations,
    expectedLocations,
    "flattened sitemap lost or added canonical URLs",
  );

  await assertRedirect(
    `${API_BASE_URL}/sitemap.xml`,
    "/api/sitemap.xml",
  );
  await assertRedirect(
    `${WEB_BASE_URL}/sitemap.xml`,
    "/api/sitemap.xml",
  );
  await assertRedirect(
    `${WEB_BASE_URL}/ai-sitemap.xml`,
    "/api/sitemap.xml",
  );

  const outOfRangeReviewShard =
    sitemapShardNumbers(reviewRows.length, true).length + 1;
  const missingChild = await fetchXml(
    `/api/sitemaps/reviews/${outOfRangeReviewShard}.xml`,
  );
  assert.equal(
    missingChild.response.status,
    404,
    "unlisted review shards must return 404",
  );

  console.log(
    `Sitemap index verified: ${actualChildPaths.length} children expose ${actualEntries.length} unique canonical URLs with exact dates, reciprocal alternates, bounded shards, shared caching, and stable redirects.`,
  );
}

main().catch((error) => {
  console.error(
    `Sitemap index verification failed: ${
      error instanceof Error ? error.message : "unknown error"
    }`,
  );
  process.exit(1);
});