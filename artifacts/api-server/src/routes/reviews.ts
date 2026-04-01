import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
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
      adCreatives: reviewStatsTable.adCreatives,
      countriesTargeted: reviewStatsTable.countriesTargeted,
      daysActive: reviewStatsTable.daysActive,
      celebritiesAbused: reviewStatsTable.celebritiesAbused,
      weeklyVelocity: reviewStatsTable.weeklyVelocity,
      firstDetected: reviewStatsTable.firstDetected,
      lastActive: reviewStatsTable.lastActive,
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

  res.json({
    ...row,
    investigationDate: row.investigationDate?.toISOString() ?? "",
    adCreatives: row.adCreatives ?? 0,
    countriesTargeted: row.countriesTargeted ?? 0,
    daysActive: row.daysActive ?? 0,
    celebritiesAbused: row.celebritiesAbused ?? 0,
    weeklyVelocity: row.weeklyVelocity ?? 0,
    firstDetected: row.firstDetected ?? "",
    lastActive: row.lastActive ?? "",
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

export default router;
