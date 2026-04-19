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
      metaDescription: reviewsTable.metaDescription,
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

  res.json({
    ...row,
    investigationDate: row.investigationDate?.toISOString() ?? "",
    metaDescription: row.metaDescription ?? "",
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
  const [rows, blogRows, latestDates] = await Promise.all([
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
  ]);

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

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const p of staticPages) {
    xml += `  <url>\n    <loc>${base}${p.loc}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  }

  for (let page = 2; page <= investigationPages; page++) {
    xml += `  <url>\n    <loc>${base}/investigations?page=${page}</loc>\n    <lastmod>${investigationsLastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }

  for (const r of rows) {
    const lastmod = r.updatedAt ? new Date(r.updatedAt).toISOString().split("T")[0] : "";
    xml += `  <url>\n    <loc>${base}/review/${encodeSlugForLoc(r.slug)}</loc>\n`;
    if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  }

  for (const b of blogRows) {
    const lastmod = b.updatedAt ? new Date(b.updatedAt).toISOString().split("T")[0] : "";
    xml += `  <url>\n    <loc>${base}/blog/${encodeSlugForLoc(b.slug)}</loc>\n`;
    if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }

  xml += `</urlset>`;

  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(xml);
});

export default router;
