import { Router, type IRouter } from "express";
import { eq, asc, desc, ne, and } from "drizzle-orm";
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

router.get("/sitemap.xml", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      slug: reviewsTable.slug,
      investigationDate: reviewsTable.investigationDate,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.status, "published"))
    .orderBy(desc(reviewsTable.investigationDate));

  const staticPages = [
    { loc: "/", changefreq: "daily", priority: "1.0" },
    { loc: "/investigations", changefreq: "daily", priority: "0.9" },
    { loc: "/report", changefreq: "monthly", priority: "0.7" },
    { loc: "/about", changefreq: "monthly", priority: "0.6" },
    { loc: "/recovery", changefreq: "monthly", priority: "0.7" },
    { loc: "/privacy", changefreq: "yearly", priority: "0.3" },
    { loc: "/terms", changefreq: "yearly", priority: "0.3" },
  ];

  const base = "https://cryptokiller.org";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const p of staticPages) {
    xml += `  <url>\n    <loc>${base}${p.loc}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  }

  for (const r of rows) {
    const lastmod = r.investigationDate ? new Date(r.investigationDate).toISOString().split("T")[0] : "";
    xml += `  <url>\n    <loc>${base}/review/${escapeXml(r.slug)}</loc>\n`;
    if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  }

  xml += `</urlset>`;

  res.set("Content-Type", "application/xml");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(xml);
});

export default router;
