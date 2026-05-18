import { Router, type IRouter } from "express";
import { eq, asc, desc, ne, and, max, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  platformsTable,
  reviewsTable,
  reviewStatsTable,
  redFlagsTable,
  funnelStagesTable,
  faqItemsTable,
  keyFindingsTable,
  geoTargetsTable,
  blogPostsTable,
  reviewTranslationsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/reviews", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: reviewsTable.id,
      slug: reviewsTable.slug,
      platformName: platformsTable.name,
      threatScore: reviewsTable.threatScore,
      verdict: reviewsTable.verdict,
      status: reviewsTable.status,
      investigationDate: reviewsTable.investigationDate,
      adCreatives: reviewStatsTable.adCreatives,
      countriesTargeted: reviewStatsTable.countriesTargeted,
      daysActive: reviewStatsTable.daysActive,
      celebritiesAbused: reviewStatsTable.celebritiesAbused,
    })
    .from(reviewsTable)
    .innerJoin(platformsTable, eq(reviewsTable.platformId, platformsTable.id))
    .leftJoin(reviewStatsTable, eq(reviewStatsTable.reviewId, reviewsTable.id))
    .where(eq(reviewsTable.status, "published"))
    .orderBy(asc(reviewsTable.investigationDate));

  res.json(rows.map(r => ({
    ...r,
    investigationDate: r.investigationDate?.toISOString() ?? "",
    adCreatives: r.adCreatives ?? 0,
    countriesTargeted: r.countriesTargeted ?? 0,
    daysActive: r.daysActive ?? 0,
    celebritiesAbused: r.celebritiesAbused ?? 0,
  })));
});

router.get("/reviews/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  const [row] = await db
    .select({
      id: reviewsTable.id,
      slug: reviewsTable.slug,
      platformName: platformsTable.name,
      threatScore: reviewsTable.threatScore,
      verdict: reviewsTable.verdict,
      status: reviewsTable.status,
      summary: reviewsTable.summary,
      heroDescription: reviewsTable.heroDescription,
      warningCallout: reviewsTable.warningCallout,
      investigationDate: reviewsTable.investigationDate,
      methodologyText: reviewsTable.methodologyText,
      disclaimerText: reviewsTable.disclaimerText,
      wordCount: reviewsTable.wordCount,
      readingMinutes: reviewsTable.readingMinutes,
      author: reviewsTable.author,
      // Persona ID drives the on-page byline + JSON-LD Person node. Without it,
      // ReviewPage.tsx falls back to the corporate "CryptoKiller Research Team"
      // string, while the SSR @graph (prerender.ts:1217) correctly resolves to
      // the M. Webb / P. Nair / D. Ortiz persona — visible E-E-A-T mismatch.
      authorPersonaId: reviewsTable.authorPersonaId,
      metaDescription: reviewsTable.metaDescription,
      // Rich-content columns (migration 0002). Surface them on the public
      // API so the React CSR hydration and any external consumers (next
      // site builds, downstream dashboards) can render the full review.
      heroImageUrl: reviewsTable.heroImageUrl,
      heroImageAlt: reviewsTable.heroImageAlt,
      contentImages: reviewsTable.contentImages,
      visualMeta: reviewsTable.visualMeta,
      protectionSteps: reviewsTable.protectionSteps,
      sources: reviewsTable.sources,
      notForYou: reviewsTable.notForYou,
      expertiseDepth: reviewsTable.expertiseDepth,
      // Tier metadata (migration 0003). Exposed on the API so the client-side
      // React hydration can gate declarative-scam copy (embed button text,
      // share/copy strings) on frameAsScam, matching the tier-aware rendering
      // the SSR now does. itemReviewed is included so CSR JSON-LD (usePageMeta
      // replaces SSR scripts after load) matches prerender's #item-reviewed graph.
      threatTier: reviewsTable.threatTier,
      threatLabel: reviewsTable.threatLabel,
      threatBadge: reviewsTable.threatBadge,
      frameAsScam: reviewsTable.frameAsScam,
      itemReviewed: reviewsTable.itemReviewed,
      adCreatives: reviewStatsTable.adCreatives,
      countriesTargeted: reviewStatsTable.countriesTargeted,
      daysActive: reviewStatsTable.daysActive,
      celebritiesAbused: reviewStatsTable.celebritiesAbused,
      weeklyVelocity: reviewStatsTable.weeklyVelocity,
      firstDetected: reviewStatsTable.firstDetected,
      lastActive: reviewStatsTable.lastActive,
      celebrityNames: reviewStatsTable.celebrityNames,
    })
    .from(reviewsTable)
    .innerJoin(platformsTable, eq(reviewsTable.platformId, platformsTable.id))
    .leftJoin(reviewStatsTable, eq(reviewStatsTable.reviewId, reviewsTable.id))
    .where(eq(reviewsTable.slug, slug));

  if (!row) {
    res.status(404).json({ error: "Review not found" });
    return;
  }

  const [funnelStages, redFlags, faqItems, keyFindings, geoTargets, translations] = await Promise.all([
    db.select().from(funnelStagesTable).where(eq(funnelStagesTable.reviewId, row.id)).orderBy(asc(funnelStagesTable.stageNumber)),
    db.select().from(redFlagsTable).where(eq(redFlagsTable.reviewId, row.id)).orderBy(asc(redFlagsTable.orderIndex)),
    db.select().from(faqItemsTable).where(eq(faqItemsTable.reviewId, row.id)).orderBy(asc(faqItemsTable.orderIndex)),
    db.select().from(keyFindingsTable).where(eq(keyFindingsTable.reviewId, row.id)).orderBy(asc(keyFindingsTable.orderIndex)),
    db.select().from(geoTargetsTable).where(eq(geoTargetsTable.reviewId, row.id)).orderBy(asc(geoTargetsTable.orderIndex)),
    // Slim translation metadata — used by ReviewPage to emit hreflang link
    // tags, the JSON-LD workTranslation array, and the "also-available-in"
    // affordance. Full translated content is fetched separately via
    // GET /reviews/translations/:locale/:slug.
    db
      .select({
        locale: reviewTranslationsTable.locale,
        slug: reviewTranslationsTable.slug,
        status: reviewTranslationsTable.status,
        title: reviewTranslationsTable.title,
        translatorName: reviewTranslationsTable.translatorName,
        translationMethod: reviewTranslationsTable.translationMethod,
        publishedAt: reviewTranslationsTable.publishedAt,
        sourceReviewUpdatedAt: reviewTranslationsTable.sourceReviewUpdatedAt,
        updatedAt: reviewTranslationsTable.updatedAt,
      })
      .from(reviewTranslationsTable)
      .where(
        and(
          eq(reviewTranslationsTable.reviewId, row.id),
          eq(reviewTranslationsTable.status, "published"),
        ),
      )
      .orderBy(asc(reviewTranslationsTable.locale)),
  ]);

  const allCountryCodes = [...new Set(
    geoTargets.flatMap(g =>
      g.countryCodes.split(",").map(c => c.trim().toUpperCase()).filter(Boolean)
    )
  )];

  res.json({
    ...row,
    investigationDate: row.investigationDate?.toISOString() ?? "",
    metaDescription: row.metaDescription ?? "",
    // Pre-migration rows have no persona; client must fall back to the legacy
    // free-text `author` column or the corporate default in that case.
    authorPersonaId: row.authorPersonaId ?? null,
    // Normalise the rich-content fields so clients always get a consistent
    // shape regardless of whether the row has been re-synced under the new
    // schema or still has pre-migration null/empty values.
    heroImageUrl: row.heroImageUrl ?? null,
    heroImageAlt: row.heroImageAlt ?? null,
    contentImages: Array.isArray(row.contentImages) ? row.contentImages : [],
    visualMeta: Array.isArray(row.visualMeta) ? row.visualMeta : [],
    protectionSteps: row.protectionSteps ?? "",
    sources: Array.isArray(row.sources) ? row.sources : [],
    notForYou: row.notForYou ?? "",
    expertiseDepth: row.expertiseDepth ?? "",
    // Tier metadata defaults: pre-migration-0003 rows return null/false so
    // the client's tierFromScore fallback kicks in (same logic as the SSR
    // prerender). frameAsScam defaults to false — hedged is always safer
    // than declarative when we don't know the tier.
    threatTier: row.threatTier ?? null,
    threatLabel: row.threatLabel ?? null,
    threatBadge: row.threatBadge ?? null,
    frameAsScam: row.frameAsScam ?? false,
    itemReviewed: row.itemReviewed ?? null,
    adCreatives: row.adCreatives ?? 0,
    countriesTargeted: row.countriesTargeted ?? 0,
    daysActive: row.daysActive ?? 0,
    celebritiesAbused: row.celebritiesAbused ?? 0,
    weeklyVelocity: row.weeklyVelocity ?? 0,
    firstDetected: row.firstDetected ?? "",
    lastActive: row.lastActive ?? "",
    celebrityNames: row.celebrityNames ?? [],
    allCountryCodes,
    funnelStages: funnelStages.map(s => ({
      stageNumber: s.stageNumber,
      title: s.title,
      description: s.description,
      statValue: s.statValue,
      statLabel: s.statLabel,
      bullets: s.bullets,
    })),
    redFlags: redFlags.map(f => ({
      emoji: f.emoji,
      title: f.title,
      description: f.description,
      orderIndex: f.orderIndex,
    })),
    faqItems: faqItems.map(f => ({
      question: f.question,
      answer: f.answer,
      orderIndex: f.orderIndex,
    })),
    keyFindings: keyFindings.map(f => ({
      content: f.content,
      orderIndex: f.orderIndex,
    })),
    geoTargets: geoTargets.map(g => ({
      region: g.region,
      countryCodes: g.countryCodes,
      orderIndex: g.orderIndex,
    })),
    translations: translations.map(t => ({
      locale: t.locale,
      slug: t.slug,
      status: t.status,
      title: t.title,
      translatorName: t.translatorName,
      translationMethod: t.translationMethod,
      publishedAt: t.publishedAt?.toISOString() ?? null,
      sourceReviewUpdatedAt: t.sourceReviewUpdatedAt?.toISOString() ?? null,
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
});

// ─── GET /reviews/translations/:locale/:slug ───
// Returns the full translated review joined with the master's structural
// fields (brand info, threat metadata, hero image, dates, schema enrichment).
// Used by the locale-prefixed routes (/it/review/:slug etc) to render the
// translation page. Locale param must be BCP-47 canonical case (`pt-BR`,
// not `pt-br`) — the route handler that calls this normalises the URL
// segment before forwarding.
const TRANSLATION_LOCALES = new Set(["it", "es", "de", "fr", "pt-BR"]);

router.get("/reviews/translations/:locale/:slug", async (req, res): Promise<void> => {
  const localeParam = Array.isArray(req.params.locale) ? req.params.locale[0] : req.params.locale;
  const slugParam = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  if (!TRANSLATION_LOCALES.has(localeParam)) {
    res.status(404).json({ error: "Unsupported locale" });
    return;
  }

  // Look up the translation by (locale, slug). We require status=published
  // so unpublished rows that linger between syncs never surface a URL.
  const [translationRow] = await db
    .select()
    .from(reviewTranslationsTable)
    .where(
      and(
        eq(reviewTranslationsTable.locale, localeParam),
        eq(reviewTranslationsTable.slug, slugParam),
        eq(reviewTranslationsTable.status, "published"),
      ),
    )
    .limit(1);

  if (!translationRow) {
    res.status(404).json({ error: "Translation not found" });
    return;
  }

  // Master row + structural joins. We piggy-back on the same shape returned
  // by GET /reviews/:slug so the React renderer can reuse one code path —
  // the only delta is which text fields it pulls from the translation vs.
  // the master.
  const [masterRow] = await db
    .select({
      id: reviewsTable.id,
      slug: reviewsTable.slug,
      platformName: platformsTable.name,
      threatScore: reviewsTable.threatScore,
      verdict: reviewsTable.verdict,
      status: reviewsTable.status,
      summary: reviewsTable.summary,
      heroDescription: reviewsTable.heroDescription,
      warningCallout: reviewsTable.warningCallout,
      investigationDate: reviewsTable.investigationDate,
      methodologyText: reviewsTable.methodologyText,
      disclaimerText: reviewsTable.disclaimerText,
      wordCount: reviewsTable.wordCount,
      readingMinutes: reviewsTable.readingMinutes,
      author: reviewsTable.author,
      authorPersonaId: reviewsTable.authorPersonaId,
      metaDescription: reviewsTable.metaDescription,
      heroImageUrl: reviewsTable.heroImageUrl,
      heroImageAlt: reviewsTable.heroImageAlt,
      contentImages: reviewsTable.contentImages,
      visualMeta: reviewsTable.visualMeta,
      protectionSteps: reviewsTable.protectionSteps,
      sources: reviewsTable.sources,
      notForYou: reviewsTable.notForYou,
      expertiseDepth: reviewsTable.expertiseDepth,
      threatTier: reviewsTable.threatTier,
      threatLabel: reviewsTable.threatLabel,
      threatBadge: reviewsTable.threatBadge,
      frameAsScam: reviewsTable.frameAsScam,
      itemReviewed: reviewsTable.itemReviewed,
      updatedAt: reviewsTable.updatedAt,
      adCreatives: reviewStatsTable.adCreatives,
      countriesTargeted: reviewStatsTable.countriesTargeted,
      daysActive: reviewStatsTable.daysActive,
      celebritiesAbused: reviewStatsTable.celebritiesAbused,
      weeklyVelocity: reviewStatsTable.weeklyVelocity,
      firstDetected: reviewStatsTable.firstDetected,
      lastActive: reviewStatsTable.lastActive,
      celebrityNames: reviewStatsTable.celebrityNames,
    })
    .from(reviewsTable)
    .innerJoin(platformsTable, eq(reviewsTable.platformId, platformsTable.id))
    .leftJoin(reviewStatsTable, eq(reviewStatsTable.reviewId, reviewsTable.id))
    .where(eq(reviewsTable.id, translationRow.reviewId));

  if (!masterRow) {
    // Orphan translation — master deleted. Should not happen under normal
    // sync (translations are wiped when the master is re-synced), but defend
    // against it.
    res.status(404).json({ error: "Master review not found" });
    return;
  }

  // Enforce master publication state. A published translation row whose
  // master has been unpublished (status='draft' or anything ≠ 'published')
  // must NOT leak via the translation URL — SSR's renderReview already
  // 404s this case, so the API must match to avoid CSR/SSR divergence
  // and silent exposure of unpublished review content.
  if (masterRow.status !== "published") {
    res.status(404).json({ error: "Master review not published" });
    return;
  }

  const [funnelStages, redFlags, faqItems, keyFindings, geoTargets, siblings] = await Promise.all([
    db.select().from(funnelStagesTable).where(eq(funnelStagesTable.reviewId, masterRow.id)).orderBy(asc(funnelStagesTable.stageNumber)),
    db.select().from(redFlagsTable).where(eq(redFlagsTable.reviewId, masterRow.id)).orderBy(asc(redFlagsTable.orderIndex)),
    db.select().from(faqItemsTable).where(eq(faqItemsTable.reviewId, masterRow.id)).orderBy(asc(faqItemsTable.orderIndex)),
    db.select().from(keyFindingsTable).where(eq(keyFindingsTable.reviewId, masterRow.id)).orderBy(asc(keyFindingsTable.orderIndex)),
    db.select().from(geoTargetsTable).where(eq(geoTargetsTable.reviewId, masterRow.id)).orderBy(asc(geoTargetsTable.orderIndex)),
    db
      .select({
        locale: reviewTranslationsTable.locale,
        slug: reviewTranslationsTable.slug,
        status: reviewTranslationsTable.status,
        title: reviewTranslationsTable.title,
        translatorName: reviewTranslationsTable.translatorName,
        translationMethod: reviewTranslationsTable.translationMethod,
        publishedAt: reviewTranslationsTable.publishedAt,
        sourceReviewUpdatedAt: reviewTranslationsTable.sourceReviewUpdatedAt,
        updatedAt: reviewTranslationsTable.updatedAt,
      })
      .from(reviewTranslationsTable)
      .where(
        and(
          eq(reviewTranslationsTable.reviewId, masterRow.id),
          eq(reviewTranslationsTable.status, "published"),
        ),
      )
      .orderBy(asc(reviewTranslationsTable.locale)),
  ]);

  const allCountryCodes = [...new Set(
    geoTargets.flatMap(g =>
      g.countryCodes.split(",").map(c => c.trim().toUpperCase()).filter(Boolean)
    )
  )];

  const masterShell = {
    ...masterRow,
    investigationDate: masterRow.investigationDate?.toISOString() ?? "",
    metaDescription: masterRow.metaDescription ?? "",
    authorPersonaId: masterRow.authorPersonaId ?? null,
    heroImageUrl: masterRow.heroImageUrl ?? null,
    heroImageAlt: masterRow.heroImageAlt ?? null,
    contentImages: Array.isArray(masterRow.contentImages) ? masterRow.contentImages : [],
    visualMeta: Array.isArray(masterRow.visualMeta) ? masterRow.visualMeta : [],
    protectionSteps: masterRow.protectionSteps ?? "",
    sources: Array.isArray(masterRow.sources) ? masterRow.sources : [],
    notForYou: masterRow.notForYou ?? "",
    expertiseDepth: masterRow.expertiseDepth ?? "",
    threatTier: masterRow.threatTier ?? null,
    threatLabel: masterRow.threatLabel ?? null,
    threatBadge: masterRow.threatBadge ?? null,
    frameAsScam: masterRow.frameAsScam ?? false,
    itemReviewed: masterRow.itemReviewed ?? null,
    adCreatives: masterRow.adCreatives ?? 0,
    countriesTargeted: masterRow.countriesTargeted ?? 0,
    daysActive: masterRow.daysActive ?? 0,
    celebritiesAbused: masterRow.celebritiesAbused ?? 0,
    weeklyVelocity: masterRow.weeklyVelocity ?? 0,
    firstDetected: masterRow.firstDetected ?? "",
    lastActive: masterRow.lastActive ?? "",
    celebrityNames: masterRow.celebrityNames ?? [],
    allCountryCodes,
    funnelStages: funnelStages.map(s => ({
      stageNumber: s.stageNumber,
      title: s.title,
      description: s.description,
      statValue: s.statValue,
      statLabel: s.statLabel,
      bullets: s.bullets,
    })),
    redFlags: redFlags.map(f => ({
      emoji: f.emoji,
      title: f.title,
      description: f.description,
      orderIndex: f.orderIndex,
    })),
    faqItems: faqItems.map(f => ({
      question: f.question,
      answer: f.answer,
      orderIndex: f.orderIndex,
    })),
    keyFindings: keyFindings.map(f => ({
      content: f.content,
      orderIndex: f.orderIndex,
    })),
    geoTargets: geoTargets.map(g => ({
      region: g.region,
      countryCodes: g.countryCodes,
      orderIndex: g.orderIndex,
    })),
    translations: siblings.map(t => ({
      locale: t.locale,
      slug: t.slug,
      status: t.status,
      title: t.title,
      translatorName: t.translatorName,
      translationMethod: t.translationMethod,
      publishedAt: t.publishedAt?.toISOString() ?? null,
      sourceReviewUpdatedAt: t.sourceReviewUpdatedAt?.toISOString() ?? null,
      updatedAt: t.updatedAt.toISOString(),
    })),
  };

  // ── Phase 8 stale detection ──
  // Translation is considered stale when source_review_updated_at lags
  // the live master.updatedAt by more than 1 hour. We use 1h instead of
  // an exact-equals check because the sync pipeline writes both columns
  // in separate transactions; small drift between them is normal and
  // should not surface a "refreshed translation in progress" banner.
  // Missing sourceReviewUpdatedAt → treat as fresh (pre-Phase 8 rows).
  const STALE_THRESHOLD_MS = 60 * 60 * 1000;
  const masterUpdatedAtMs = masterRow.updatedAt.getTime();
  const sourceMs = translationRow.sourceReviewUpdatedAt?.getTime() ?? null;
  const stale = sourceMs !== null && sourceMs < masterUpdatedAtMs - STALE_THRESHOLD_MS;

  res.json({
    locale: translationRow.locale,
    slug: translationRow.slug,
    status: translationRow.status,
    title: translationRow.title,
    metaDescription: translationRow.metaDescription,
    headline: translationRow.headline,
    alternativeHeadline: translationRow.alternativeHeadline,
    summary: translationRow.summary,
    verdict: translationRow.verdict,
    howItWorks: translationRow.howItWorks,
    fullArticle: translationRow.fullArticle,
    redFlags: translationRow.redFlags ?? null,
    faq: translationRow.faq ?? null,
    keyTakeaways: translationRow.keyTakeaways ?? null,
    notForYou: translationRow.notForYou,
    protectionSteps: translationRow.protectionSteps,
    methodology: translationRow.methodology,
    disclaimer: translationRow.disclaimer,
    expertiseDepth: translationRow.expertiseDepth,
    translationMethod: translationRow.translationMethod,
    translatorName: translationRow.translatorName,
    translatorCredentials: translationRow.translatorCredentials,
    aiModel: translationRow.aiModel,
    aiPromptVersion: translationRow.aiPromptVersion,
    reviewedAt: translationRow.reviewedAt?.toISOString() ?? null,
    wordCount: translationRow.wordCount,
    publishedAt: translationRow.publishedAt?.toISOString() ?? null,
    sourceReviewUpdatedAt: translationRow.sourceReviewUpdatedAt?.toISOString() ?? null,
    updatedAt: translationRow.updatedAt.toISOString(),
    masterUpdatedAt: masterRow.updatedAt.toISOString(),
    stale,
    masterSlug: masterRow.slug,
    master: masterShell,
    siblingTranslations: masterShell.translations,
  });
});

router.get("/reviews/:slug/related", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  const [current] = await db
    .select({ id: reviewsTable.id })
    .from(reviewsTable)
    .where(eq(reviewsTable.slug, slug));

  if (!current) {
    res.json([]);
    return;
  }

  const rows = await db
    .select({
      id: reviewsTable.id,
      slug: reviewsTable.slug,
      platformName: platformsTable.name,
      threatScore: reviewsTable.threatScore,
      verdict: reviewsTable.verdict,
      adCreatives: reviewStatsTable.adCreatives,
    })
    .from(reviewsTable)
    .innerJoin(platformsTable, eq(reviewsTable.platformId, platformsTable.id))
    .leftJoin(reviewStatsTable, eq(reviewStatsTable.reviewId, reviewsTable.id))
    .where(and(eq(reviewsTable.status, "published"), ne(reviewsTable.id, current.id)))
    .orderBy(desc(reviewsTable.threatScore))
    .limit(6);

  res.json(rows.map(r => ({
    ...r,
    adCreatives: r.adCreatives ?? 0,
    verdict: r.verdict ?? "",
  })));
});

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function encodeSlugForLoc(slug: string): string {
  return escapeXml(encodeURI(slug));
}

// Phase 6 — i18n sitemap helpers. Locale URL segments are lowercase
// (`/it/`, `/pt-br/`) while DB / hreflang values are BCP-47 canonical
// (`it`, `pt-BR`). Hreflang uses bare codes per Phase 5 cheat sheet.
const SITEMAP_LOCALE_URL_SEGMENT: Record<string, string> = {
  it: "it",
  es: "es",
  de: "de",
  fr: "fr",
  "pt-BR": "pt-br",
};
const SITEMAP_LOCALE_HREFLANG: Record<string, string> = {
  it: "it",
  es: "es",
  de: "de",
  fr: "fr",
  "pt-BR": "pt-BR",
};

router.get("/sitemap.xml", async (_req, res): Promise<void> => {
  const [rows, blogRows, latestDates, topicRowsRaw, translationRows] = await Promise.all([
    db
      .select({
        id: reviewsTable.id,
        slug: reviewsTable.slug,
        updatedAt: reviewsTable.updatedAt,
      })
      .from(reviewsTable)
      .where(eq(reviewsTable.status, "published"))
      .orderBy(desc(reviewsTable.updatedAt)),
    db
      .select({
        slug: blogPostsTable.slug,
        updatedAt: blogPostsTable.updatedAt,
      })
      .from(blogPostsTable)
      .where(eq(blogPostsTable.status, "published"))
      .orderBy(desc(blogPostsTable.updatedAt)),
    Promise.all([
      db
        .select({ latest: max(reviewsTable.updatedAt) })
        .from(reviewsTable)
        .where(eq(reviewsTable.status, "published")),
      db
        .select({ latest: max(blogPostsTable.updatedAt) })
        .from(blogPostsTable)
        .where(eq(blogPostsTable.status, "published")),
    ]),
    // Topic-cluster pages (/topics/:slug) — one URL per distinct
    // about_slugs value across published blog_posts. Lastmod is the
    // most recent updatedAt among articles tagged with that topic.
    db.execute(sql`
      SELECT slug, MAX(updated_at) AS last_updated
      FROM (
        SELECT jsonb_array_elements_text(about_slugs) AS slug, updated_at
        FROM blog_posts
        WHERE status = 'published' AND jsonb_typeof(about_slugs) = 'array'
      ) t
      GROUP BY slug
      ORDER BY slug ASC
    `),
    // Phase 6 — published review_translations. Grouped per-review-id so we
    // can attach xhtml:link clusters to each master URL AND emit a `<url>`
    // entry per locale with the same reciprocal cluster.
    db
      .select({
        reviewId: reviewTranslationsTable.reviewId,
        locale: reviewTranslationsTable.locale,
        slug: reviewTranslationsTable.slug,
        updatedAt: reviewTranslationsTable.updatedAt,
      })
      .from(reviewTranslationsTable)
      .where(eq(reviewTranslationsTable.status, "published")),
  ]);

  // drizzle.execute() shape varies by driver — handle both.
  const topicRows = (
    (topicRowsRaw as unknown as { rows?: unknown[] }).rows ??
    (topicRowsRaw as unknown as unknown[])
  ) as Array<{ slug: string; last_updated: string | Date | null }>;

  const latestReviewDate = latestDates[0][0]?.latest;
  const latestBlogDate = latestDates[1][0]?.latest;
  const globalLastmod = [latestReviewDate, latestBlogDate]
    .filter(Boolean)
    .map((d) => new Date(d!).getTime())
    .sort((a, b) => b - a)[0];
  const globalLastmodStr = globalLastmod
    ? new Date(globalLastmod).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const investigationsLastmod = latestReviewDate
    ? new Date(latestReviewDate).toISOString().split("T")[0]
    : globalLastmodStr;
  const blogLastmod = latestBlogDate
    ? new Date(latestBlogDate).toISOString().split("T")[0]
    : globalLastmodStr;

  const ITEMS_PER_PAGE = 20;
  const investigationPages = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE));

  const staticPages = [
    { loc: "/", changefreq: "daily", priority: "1.0", lastmod: globalLastmodStr },
    { loc: "/investigations", changefreq: "daily", priority: "0.9", lastmod: investigationsLastmod },
    { loc: "/blog", changefreq: "daily", priority: "0.8", lastmod: blogLastmod },
    { loc: "/methodology", changefreq: "monthly", priority: "0.8", lastmod: globalLastmodStr },
    { loc: "/report", changefreq: "monthly", priority: "0.7", lastmod: globalLastmodStr },
    { loc: "/about", changefreq: "monthly", priority: "0.6", lastmod: globalLastmodStr },
    { loc: "/recovery", changefreq: "monthly", priority: "0.7", lastmod: globalLastmodStr },
    { loc: "/privacy", changefreq: "yearly", priority: "0.3", lastmod: globalLastmodStr },
    { loc: "/terms", changefreq: "yearly", priority: "0.3", lastmod: globalLastmodStr },
  ];

  const base = "https://cryptokiller.org";

  // Phase 6 — bucket translations by review id so each master row can emit
  // the full reciprocal alternate cluster (en + each published locale +
  // x-default), and locale URLs can emit the SAME cluster (reciprocity is
  // the whole point — Google ignores one-way hreflang).
  const translationsByReviewId = new Map<
    number,
    Array<{ locale: string; slug: string; updatedAt: Date | null }>
  >();
  for (const t of translationRows) {
    if (!SITEMAP_LOCALE_URL_SEGMENT[t.locale]) continue; // unsupported locale, skip
    const bucket = translationsByReviewId.get(t.reviewId) ?? [];
    bucket.push({ locale: t.locale, slug: t.slug, updatedAt: t.updatedAt });
    translationsByReviewId.set(t.reviewId, bucket);
  }

  // Helper: render the alternate cluster for a review (master en + locales
  // + x-default). Same cluster is emitted on the master URL and on every
  // locale URL — bidirectional reciprocity at the sitemap layer.
  const renderAlternates = (
    masterSlug: string,
    siblings: Array<{ locale: string; slug: string }>,
  ): string => {
    if (siblings.length === 0) return "";
    let out =
      `    <xhtml:link rel="alternate" hreflang="en" href="${base}/review/${encodeSlugForLoc(masterSlug)}"/>\n`;
    for (const s of siblings) {
      const seg = SITEMAP_LOCALE_URL_SEGMENT[s.locale];
      const hl = SITEMAP_LOCALE_HREFLANG[s.locale];
      if (!seg || !hl) continue;
      out += `    <xhtml:link rel="alternate" hreflang="${hl}" href="${base}/${seg}/review/${encodeSlugForLoc(s.slug)}"/>\n`;
    }
    out += `    <xhtml:link rel="alternate" hreflang="x-default" href="${base}/review/${encodeSlugForLoc(masterSlug)}"/>\n`;
    return out;
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

  for (const p of staticPages) {
    xml += `  <url>\n    <loc>${base}${p.loc}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  }

  for (let page = 2; page <= investigationPages; page++) {
    xml += `  <url>\n    <loc>${base}/investigations?page=${page}</loc>\n    <lastmod>${investigationsLastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }

  for (const r of rows) {
    const siblings = translationsByReviewId.get(r.id) ?? [];
    const alternatesXml = renderAlternates(r.slug, siblings);
    const lastmod = r.updatedAt ? new Date(r.updatedAt).toISOString().split("T")[0] : "";
    xml += `  <url>\n    <loc>${base}/review/${encodeSlugForLoc(r.slug)}</loc>\n`;
    if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n${alternatesXml}  </url>\n`;

    // Phase 6 — emit one `<url>` entry per published translation, each
    // carrying the SAME reciprocal alternate cluster. Lastmod uses the
    // translation row's own updatedAt so Google can see when the locale
    // copy was refreshed independently of the master.
    for (const s of siblings) {
      const seg = SITEMAP_LOCALE_URL_SEGMENT[s.locale];
      if (!seg) continue;
      const tLastmod = s.updatedAt
        ? new Date(s.updatedAt).toISOString().split("T")[0]
        : lastmod;
      xml += `  <url>\n    <loc>${base}/${seg}/review/${encodeSlugForLoc(s.slug)}</loc>\n`;
      if (tLastmod) xml += `    <lastmod>${tLastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n${alternatesXml}  </url>\n`;
    }
  }

  for (const b of blogRows) {
    const lastmod = b.updatedAt ? new Date(b.updatedAt).toISOString().split("T")[0] : "";
    xml += `  <url>\n    <loc>${base}/blog/${encodeSlugForLoc(b.slug)}</loc>\n`;
    if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }

  // Topics index — one URL listing all topics
  if (topicRows.length > 0) {
    const topicsLastmod = topicRows
      .map((t) => t.last_updated)
      .filter((d): d is string | Date => d != null)
      .map((d) => new Date(d as string).getTime())
      .sort((a, b) => b - a)[0];
    const topicsLastmodStr = topicsLastmod
      ? new Date(topicsLastmod).toISOString().split("T")[0]
      : globalLastmodStr;
    xml += `  <url>\n    <loc>${base}/topics</loc>\n    <lastmod>${topicsLastmodStr}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }

  // Topic cluster pages — one URL per distinct topic slug
  for (const t of topicRows) {
    const lastmod = t.last_updated ? new Date(t.last_updated as string).toISOString().split("T")[0] : "";
    xml += `  <url>\n    <loc>${base}/topics/${encodeSlugForLoc(t.slug)}</loc>\n`;
    if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
  }

  xml += `</urlset>`;

  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(xml);
});

export default router;
