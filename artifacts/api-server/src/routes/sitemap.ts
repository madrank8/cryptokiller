import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  blogPostsTable,
  reviewsTable,
  reviewTranslationsTable,
} from "@workspace/db";
import { LOCALE_HREFLANG } from "@workspace/i18n";
import { AUTHOR_PROFILE_SLUGS } from "@workspace/site-content";
import {
  BLOG_HUB,
  HOST,
  LOCALE_URL_SEGMENT,
  blogUrl,
  reviewLocaleUrl,
  reviewUrl,
} from "../canonical-urls";
import {
  SITEMAP_CACHE_CONTROL,
  SITEMAP_URL_LIMIT,
  buildInvestigationPaginationPages,
  buildSitemapHubLastmods,
  buildStaticSitemapPages,
  renderSitemapIndex,
  renderSitemapUrlSet,
  sitemapShardNumbers,
  sitemapShardOffset,
  type SitemapAlternate,
  type SitemapPage,
  type SitemapUrlEntry,
} from "../lib/sitemap-pages";

const router: IRouter = Router();
const CHILD_BASE = `${HOST}/api/sitemaps`;
const SUPPORTED_LOCALES = Object.keys(LOCALE_URL_SEGMENT);
const LOCALE_BY_SEGMENT = new Map(
  Object.entries(LOCALE_URL_SEGMENT).map(([locale, segment]) => [
    segment,
    locale,
  ]),
);

function dateOnly(value: Date | string | null | undefined): string | undefined {
  return value ? new Date(value).toISOString().split("T")[0] : undefined;
}

function countValue(value: number | string | bigint | null | undefined): number {
  const parsed = Number(value ?? 0);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid sitemap row count: ${String(value)}`);
  }
  return parsed;
}

function parseShard(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const match = value?.match(/^([1-9]\d*)\.xml$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function sendXml(res: Response, xml: string): void {
  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", SITEMAP_CACHE_CONTROL);
  res.send(xml);
}

function sendNotFound(res: Response): void {
  res.set("Cache-Control", "no-store");
  res.status(404).type("text/plain").send("Sitemap child not found");
}

function pageEntry(page: SitemapPage): SitemapUrlEntry {
  return {
    loc: `${HOST}${page.loc}`,
    ...(page.lastmod ? { lastmod: page.lastmod } : {}),
    changefreq: page.changefreq,
    priority: page.priority,
  };
}

type TranslationRef = {
  reviewId: number;
  locale: string;
  slug: string;
};

function translationsByReview(
  rows: readonly TranslationRef[],
): Map<number, TranslationRef[]> {
  const grouped = new Map<number, TranslationRef[]>();
  for (const row of rows) {
    if (!LOCALE_URL_SEGMENT[row.locale]) continue;
    const bucket = grouped.get(row.reviewId) ?? [];
    bucket.push(row);
    grouped.set(row.reviewId, bucket);
  }
  return grouped;
}

function alternateCluster(
  masterSlug: string,
  siblings: readonly TranslationRef[],
): SitemapAlternate[] {
  if (siblings.length === 0) return [];
  const masterUrl = reviewUrl(masterSlug);
  const alternates: SitemapAlternate[] = [
    { hreflang: "en", href: masterUrl },
  ];
  for (const sibling of siblings) {
    const href = reviewLocaleUrl(sibling.locale, sibling.slug);
    const hreflang = LOCALE_HREFLANG[sibling.locale];
    if (href && hreflang) alternates.push({ hreflang, href });
  }
  alternates.push({ hreflang: "x-default", href: masterUrl });
  return alternates;
}

async function publishedCounts(): Promise<{
  reviewCount: number;
  blogCount: number;
  localeCounts: Map<string, number>;
}> {
  const [reviewRows, blogRows, localeRows] = await Promise.all([
    db
      .select({ total: count() })
      .from(reviewsTable)
      .where(eq(reviewsTable.status, "published")),
    db
      .select({ total: count() })
      .from(blogPostsTable)
      .where(eq(blogPostsTable.status, "published")),
    db
      .select({
        locale: reviewTranslationsTable.locale,
        total: count(),
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
      .groupBy(reviewTranslationsTable.locale),
  ]);
  return {
    reviewCount: countValue(reviewRows[0]?.total),
    blogCount: countValue(blogRows[0]?.total),
    localeCounts: new Map(
      localeRows.map((row) => [row.locale, countValue(row.total)]),
    ),
  };
}

router.get("/sitemap.xml", async (_req, res): Promise<void> => {
  const { reviewCount, blogCount, localeCounts } = await publishedCounts();
  const children = [
    { loc: `${CHILD_BASE}/core.xml` },
    ...sitemapShardNumbers(blogCount, true).map((shard) => ({
      loc: `${CHILD_BASE}/blog/${shard}.xml`,
    })),
    ...sitemapShardNumbers(reviewCount, true).map((shard) => ({
      loc: `${CHILD_BASE}/reviews/${shard}.xml`,
    })),
    ...SUPPORTED_LOCALES.flatMap((locale) => {
      const countForLocale = localeCounts.get(locale) ?? 0;
      const segment = LOCALE_URL_SEGMENT[locale];
      return sitemapShardNumbers(countForLocale).map((shard) => ({
        loc: `${CHILD_BASE}/locales/${segment}/${shard}.xml`,
      }));
    }),
  ];
  sendXml(res, renderSitemapIndex(children));
});

router.get("/sitemaps/core.xml", async (_req, res): Promise<void> => {
  const [reviewCountRows, latestBlogRows] = await Promise.all([
    db
      .select({ total: count() })
      .from(reviewsTable)
      .where(eq(reviewsTable.status, "published")),
    db
      .select({ updatedAt: blogPostsTable.updatedAt })
      .from(blogPostsTable)
      .where(eq(blogPostsTable.status, "published"))
      .orderBy(desc(blogPostsTable.updatedAt), asc(blogPostsTable.slug))
      .limit(1),
  ]);
  const hubLastmods = buildSitemapHubLastmods({
    latestReviewDate: undefined,
    latestBlogDate: latestBlogRows[0]?.updatedAt,
  });
  const entries: SitemapUrlEntry[] = [
    ...buildStaticSitemapPages(hubLastmods).map(pageEntry),
    ...AUTHOR_PROFILE_SLUGS.map((slug) =>
      pageEntry({
        loc: `/author/${slug}`,
        changefreq: "monthly",
        priority: "0.6",
      }),
    ),
    ...buildInvestigationPaginationPages(
      countValue(reviewCountRows[0]?.total),
    ).map(pageEntry),
  ];
  sendXml(res, renderSitemapUrlSet(entries));
});

router.get(
  "/sitemaps/blog/:shard",
  async (req: Request, res: Response): Promise<void> => {
    const shard = parseShard(req.params.shard);
    if (!shard) return sendNotFound(res);
    const rows = await db
      .select({
        slug: blogPostsTable.slug,
        updatedAt: blogPostsTable.updatedAt,
      })
      .from(blogPostsTable)
      .where(eq(blogPostsTable.status, "published"))
      .orderBy(asc(blogPostsTable.id), asc(blogPostsTable.slug))
      .limit(SITEMAP_URL_LIMIT)
      .offset(sitemapShardOffset(shard));
    if (rows.length === 0 && shard > 1) return sendNotFound(res);
    sendXml(
      res,
      renderSitemapUrlSet(
        rows.map((row) => ({
          loc: blogUrl(row.slug),
          lastmod: dateOnly(row.updatedAt),
          changefreq: "weekly",
          priority: "0.7",
        })),
      ),
    );
  },
);

router.get(
  "/sitemaps/reviews/:shard",
  async (req: Request, res: Response): Promise<void> => {
    const shard = parseShard(req.params.shard);
    if (!shard) return sendNotFound(res);
    const rows = await db
      .select({
        id: reviewsTable.id,
        slug: reviewsTable.slug,
        updatedAt: reviewsTable.updatedAt,
      })
      .from(reviewsTable)
      .where(eq(reviewsTable.status, "published"))
      .orderBy(asc(reviewsTable.id), asc(reviewsTable.slug))
      .limit(SITEMAP_URL_LIMIT)
      .offset(sitemapShardOffset(shard));
    if (rows.length === 0 && shard > 1) return sendNotFound(res);

    const reviewIds = rows.map((row) => row.id);
    const siblingRows =
      reviewIds.length === 0
        ? []
        : await db
            .select({
              reviewId: reviewTranslationsTable.reviewId,
              locale: reviewTranslationsTable.locale,
              slug: reviewTranslationsTable.slug,
            })
            .from(reviewTranslationsTable)
            .where(
              and(
                eq(reviewTranslationsTable.status, "published"),
                inArray(reviewTranslationsTable.reviewId, reviewIds),
                inArray(reviewTranslationsTable.locale, SUPPORTED_LOCALES),
              ),
            )
            .orderBy(
              asc(reviewTranslationsTable.reviewId),
              asc(reviewTranslationsTable.locale),
              asc(reviewTranslationsTable.slug),
            );
    const siblings = translationsByReview(siblingRows);
    sendXml(
      res,
      renderSitemapUrlSet(
        rows.map((row) => ({
          loc: reviewUrl(row.slug),
          lastmod: dateOnly(row.updatedAt),
          changefreq: "weekly",
          priority: "0.8",
          alternates: alternateCluster(
            row.slug,
            siblings.get(row.id) ?? [],
          ),
        })),
      ),
    );
  },
);

router.get(
  "/sitemaps/locales/:segment/:shard",
  async (req: Request, res: Response): Promise<void> => {
    const segment = Array.isArray(req.params.segment)
      ? req.params.segment[0]
      : req.params.segment;
    const locale = LOCALE_BY_SEGMENT.get(segment);
    const shard = parseShard(req.params.shard);
    if (!locale || !shard) return sendNotFound(res);

    const rows = await db
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
          eq(reviewTranslationsTable.locale, locale),
          eq(reviewsTable.status, "published"),
        ),
      )
      .orderBy(
        asc(reviewTranslationsTable.reviewId),
        asc(reviewTranslationsTable.slug),
      )
      .limit(SITEMAP_URL_LIMIT)
      .offset(sitemapShardOffset(shard));
    if (rows.length === 0) return sendNotFound(res);

    const reviewIds = [...new Set(rows.map((row) => row.reviewId))];
    const siblingRows = await db
      .select({
        reviewId: reviewTranslationsTable.reviewId,
        locale: reviewTranslationsTable.locale,
        slug: reviewTranslationsTable.slug,
      })
      .from(reviewTranslationsTable)
      .where(
        and(
          eq(reviewTranslationsTable.status, "published"),
          inArray(reviewTranslationsTable.reviewId, reviewIds),
          inArray(reviewTranslationsTable.locale, SUPPORTED_LOCALES),
        ),
      )
      .orderBy(
        asc(reviewTranslationsTable.reviewId),
        asc(reviewTranslationsTable.locale),
        asc(reviewTranslationsTable.slug),
      );
    const siblings = translationsByReview(siblingRows);
    sendXml(
      res,
      renderSitemapUrlSet(
        rows.map((row) => ({
          loc: reviewLocaleUrl(row.locale, row.slug)!,
          lastmod: dateOnly(row.updatedAt),
          changefreq: "weekly",
          priority: "0.7",
          alternates: alternateCluster(
            row.masterSlug,
            siblings.get(row.reviewId) ?? [],
          ),
        })),
      ),
    );
  },
);

export default router;