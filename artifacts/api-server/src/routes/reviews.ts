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

// Keep in sync with artifacts/crypto-review/server/prerender.ts SUPPORTED_LOCALES.
// Added locales need both list updates; the SSR router and the API
// validation must accept the same set to avoid one returning translated
// content the other can't route.
const SUPPORTED_LOCALES = new Set(["en", "fr", "es"]);

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
  // ?locale=fr|es triggers a translation overlay. EN (default) returns
  // the master row unchanged. Unknown locales are silently ignored so
  // a typo in the client doesn't 5xx — the page just stays English.
  const rawLocale = typeof req.query.locale === "string" ? req.query.locale.toLowerCase() : "";
  const locale: string = SUPPORTED_LOCALES.has(rawLocale) ? rawLocale : "en";

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

  const [funnelStages, redFlags, faqItems, keyFindings, geoTargets] = await Promise.all([
    db.select().from(funnelStagesTable).where(eq(funnelStagesTable.reviewId, row.id)).orderBy(asc(funnelStagesTable.stageNumber)),
    db.select().from(redFlagsTable).where(eq(redFlagsTable.reviewId, row.id)).orderBy(asc(redFlagsTable.orderIndex)),
    db.select().from(faqItemsTable).where(eq(faqItemsTable.reviewId, row.id)).orderBy(asc(faqItemsTable.orderIndex)),
    db.select().from(keyFindingsTable).where(eq(keyFindingsTable.reviewId, row.id)).orderBy(asc(keyFindingsTable.orderIndex)),
    db.select().from(geoTargetsTable).where(eq(geoTargetsTable.reviewId, row.id)).orderBy(asc(geoTargetsTable.orderIndex)),
  ]);

  const allCountryCodes = [...new Set(
    geoTargets.flatMap(g =>
      g.countryCodes.split(",").map(c => c.trim().toUpperCase()).filter(Boolean)
    )
  )];

  // ── Translation overlay (locale !== "en") ──
  // Mirror what artifacts/crypto-review/server/prerender.ts does for the
  // SSR path: when the client asks for a localized review, JOIN the
  // matching `review_translations` row and overlay its prose fields.
  // 404 when the translation doesn't exist OR isn't published — same
  // contract as the SSR (don't silently serve EN under an FR canonical).
  let overlay: {
    metaDescription: string;
    alternativeHeadline: string;
    summary: string;
    heroDescription: string;
    verdict: string;
    methodologyText: string;
    disclaimerText: string;
    protectionSteps: string;
    notForYou: string;
    expertiseDepth: string;
    fullArticle: string;
    wordCount: number;
    readingMinutes: number;
    redFlags: Array<{ emoji: string; title: string; description: string; orderIndex: number }>;
    faqItems: Array<{ question: string; answer: string; orderIndex: number }>;
    translatorName: string | null;
    locale: string;
  } | null = null;

  if (locale !== "en") {
    const [trow] = await db
      .select()
      .from(reviewTranslationsTable)
      .where(
        and(
          eq(reviewTranslationsTable.slug, slug),
          eq(reviewTranslationsTable.locale, locale),
        ),
      )
      .limit(1);

    if (!trow || trow.status !== "published") {
      res.status(404).json({ error: "Review translation not found", slug, locale });
      return;
    }

    const tk = Array.isArray(trow.keyTakeaways) ? (trow.keyTakeaways as unknown[]) : [];
    const localRedFlags = Array.isArray(trow.redFlags)
      ? (trow.redFlags as unknown[]).map((rfRaw, i) => {
          const rf = rfRaw as { flag?: string; detail?: string; emoji?: string; title?: string; description?: string };
          if (rf.title || rf.description || rf.emoji) {
            return {
              emoji: rf.emoji || "🚩",
              title: rf.title || "",
              description: rf.description || "",
              orderIndex: i,
            };
          }
          const flagStr = typeof rf.flag === "string" ? rf.flag : "";
          const detail = typeof rf.detail === "string" ? rf.detail : "";
          const parts = flagStr.split(" ");
          const emoji = parts[0] || "🚩";
          const title = parts.slice(1).join(" ") || flagStr;
          return { emoji, title, description: detail, orderIndex: i };
        })
      : [];
    const localFaq = Array.isArray(trow.faq)
      ? (trow.faq as unknown[]).map((fRaw, i) => {
          const f = fRaw as { question?: unknown; answer?: unknown };
          return {
            question: String(f.question ?? ""),
            answer: String(f.answer ?? ""),
            orderIndex: i,
          };
        })
      : [];

    overlay = {
      metaDescription: trow.metaDescription?.trim() ? trow.metaDescription : (row.metaDescription ?? ""),
      alternativeHeadline: trow.alternativeHeadline?.trim()
        ? trow.alternativeHeadline
        : (trow.title?.trim() ? trow.title : ""),
      summary: tk.length > 0 ? tk.map((x) => String(x)).join("\n") : (trow.summary || row.summary || ""),
      heroDescription: trow.summary?.trim() ? trow.summary : (row.heroDescription ?? ""),
      verdict: trow.verdict?.trim() ? trow.verdict : (row.verdict ?? ""),
      methodologyText: trow.methodology?.trim() ? trow.methodology : (row.methodologyText ?? ""),
      disclaimerText: trow.disclaimer?.trim() ? trow.disclaimer : (row.disclaimerText ?? ""),
      protectionSteps: trow.protectionSteps?.trim() ? trow.protectionSteps : (row.protectionSteps ?? ""),
      notForYou: trow.notForYou?.trim() ? trow.notForYou : (row.notForYou ?? ""),
      expertiseDepth: trow.expertiseDepth?.trim() ? trow.expertiseDepth : (row.expertiseDepth ?? ""),
      fullArticle: trow.fullArticle?.trim() ? trow.fullArticle : "",
      wordCount: trow.wordCount && trow.wordCount > 0 ? trow.wordCount : (row.wordCount ?? 0),
      readingMinutes:
        trow.wordCount && trow.wordCount > 0
          ? Math.max(1, Math.ceil(trow.wordCount / 230))
          : (row.readingMinutes ?? 0),
      redFlags: localRedFlags.length > 0 ? localRedFlags : redFlags.map(f => ({
        emoji: f.emoji, title: f.title, description: f.description, orderIndex: f.orderIndex,
      })),
      faqItems: localFaq.length > 0 ? localFaq : faqItems.map(f => ({
        question: f.question, answer: f.answer, orderIndex: f.orderIndex,
      })),
      translatorName: trow.translatorName?.trim() || null,
      locale,
    };
  }

  res.json({
    ...row,
    investigationDate: row.investigationDate?.toISOString() ?? "",
    metaDescription: overlay ? overlay.metaDescription : (row.metaDescription ?? ""),
    // Pre-migration rows have no persona; client must fall back to the legacy
    // free-text `author` column or the corporate default in that case.
    authorPersonaId: row.authorPersonaId ?? null,
    // Translation provenance — when the response is localized this
    // carries the translator's display name (if upstream supplied one)
    // and the locale tag. EN responses carry locale="en" and a null
    // translator.
    locale: overlay ? overlay.locale : "en",
    translatorName: overlay ? overlay.translatorName : null,
    // Translated prose surface — overlay when locale !== en, else
    // master row passthrough (unchanged response shape for EN clients).
    ...(overlay
      ? {
          alternativeHeadline: overlay.alternativeHeadline,
          summary: overlay.summary,
          heroDescription: overlay.heroDescription,
          verdict: overlay.verdict,
          methodologyText: overlay.methodologyText,
          disclaimerText: overlay.disclaimerText,
          fullArticle: overlay.fullArticle,
          wordCount: overlay.wordCount,
          readingMinutes: overlay.readingMinutes,
        }
      : {}),
    // Normalise the rich-content fields so clients always get a consistent
    // shape regardless of whether the row has been re-synced under the new
    // schema or still has pre-migration null/empty values.
    heroImageUrl: row.heroImageUrl ?? null,
    heroImageAlt: row.heroImageAlt ?? null,
    contentImages: Array.isArray(row.contentImages) ? row.contentImages : [],
    visualMeta: Array.isArray(row.visualMeta) ? row.visualMeta : [],
    protectionSteps: overlay ? overlay.protectionSteps : (row.protectionSteps ?? ""),
    sources: Array.isArray(row.sources) ? row.sources : [],
    notForYou: overlay ? overlay.notForYou : (row.notForYou ?? ""),
    expertiseDepth: overlay ? overlay.expertiseDepth : (row.expertiseDepth ?? ""),
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
    redFlags: overlay
      ? overlay.redFlags
      : redFlags.map(f => ({
          emoji: f.emoji,
          title: f.title,
          description: f.description,
          orderIndex: f.orderIndex,
        })),
    faqItems: overlay
      ? overlay.faqItems
      : faqItems.map(f => ({
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

router.get("/sitemap.xml", async (_req, res): Promise<void> => {
  const [rows, blogRows, latestDates, topicRowsRaw, translationRows] = await Promise.all([
    db
      .select({
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
    // Published review translations — used to (a) emit `/<locale>/review/<slug>`
    // sitemap entries and (b) attach xhtml:link[hreflang] siblings to
    // the EN review URLs so Google can discover the localized variants.
    db
      .select({
        slug: reviewTranslationsTable.slug,
        locale: reviewTranslationsTable.locale,
        updatedAt: reviewTranslationsTable.updatedAt,
      })
      .from(reviewTranslationsTable)
      .where(eq(reviewTranslationsTable.status, "published")),
  ]);

  // drizzle.execute() shape varies by driver — handle both.
  const topicRows = (
    (topicRowsRaw as unknown as { rows?: unknown[] }).rows
      ?? (topicRowsRaw as unknown as unknown[])
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

  // Index published translations by slug so we can emit xhtml:link
  // siblings on the EN review URL and standalone `/<locale>/review/<slug>`
  // entries for the localized variants. Slug+locale uniqueness is
  // already enforced at the DB level.
  const translationsBySlug = new Map<string, Array<{ locale: string; lastmod: string }>>();
  for (const tr of translationRows) {
    if (!tr.slug || !tr.locale) continue;
    const lastmod = tr.updatedAt ? new Date(tr.updatedAt).toISOString().split("T")[0] : "";
    const list = translationsBySlug.get(tr.slug) ?? [];
    list.push({ locale: tr.locale, lastmod });
    translationsBySlug.set(tr.slug, list);
  }

  // urlset needs the xhtml namespace declared in the document root for
  // xhtml:link siblings to validate. Adding it unconditionally is
  // harmless when no localized URLs are emitted.
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

  for (const p of staticPages) {
    xml += `  <url>\n    <loc>${base}${p.loc}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  }

  for (let page = 2; page <= investigationPages; page++) {
    xml += `  <url>\n    <loc>${base}/investigations?page=${page}</loc>\n    <lastmod>${investigationsLastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }

  for (const r of rows) {
    const lastmod = r.updatedAt ? new Date(r.updatedAt).toISOString().split("T")[0] : "";
    const slugEncoded = encodeSlugForLoc(r.slug);
    const enLoc = `${base}/review/${slugEncoded}`;
    const localeList = translationsBySlug.get(r.slug) ?? [];

    // EN entry. Append xhtml:link siblings for every locale that has a
    // published translation (plus self + x-default). Restricting to
    // existing translations means we never advertise a sibling that
    // resolves to a 404.
    xml += `  <url>\n    <loc>${enLoc}</loc>\n`;
    if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n`;
    if (localeList.length > 0) {
      xml += `    <xhtml:link rel="alternate" hreflang="en" href="${enLoc}" />\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${enLoc}" />\n`;
      for (const { locale: loc } of localeList) {
        xml += `    <xhtml:link rel="alternate" hreflang="${escapeXml(loc)}" href="${base}/${escapeXml(loc)}/review/${slugEncoded}" />\n`;
      }
    }
    xml += `  </url>\n`;

    // Per-locale entries. Same xhtml:link sibling set so Google can
    // cross-reference any direction.
    for (const { locale: loc, lastmod: trLastmod } of localeList) {
      const locLoc = `${base}/${escapeXml(loc)}/review/${slugEncoded}`;
      const useLastmod = trLastmod || lastmod;
      xml += `  <url>\n    <loc>${locLoc}</loc>\n`;
      if (useLastmod) xml += `    <lastmod>${useLastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="en" href="${enLoc}" />\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${enLoc}" />\n`;
      for (const { locale: loc2 } of localeList) {
        xml += `    <xhtml:link rel="alternate" hreflang="${escapeXml(loc2)}" href="${base}/${escapeXml(loc2)}/review/${slugEncoded}" />\n`;
      }
      xml += `  </url>\n`;
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
