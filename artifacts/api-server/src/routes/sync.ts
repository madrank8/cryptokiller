import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
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

const router: IRouter = Router();

router.post("/sync/review", async (req, res): Promise<void> => {
  const secret = req.headers["x-sync-secret"];
  if (!process.env.SYNC_SECRET || secret !== process.env.SYNC_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const payload = req.body;
  if (!payload || !payload.slug || !payload.platformName) {
    res.status(400).json({ error: "Missing required fields: slug, platformName" });
    return;
  }

  // Upsert platform
  let [platform] = await db
    .select()
    .from(platformsTable)
    .where(eq(platformsTable.slug, payload.slug));

  if (!platform) {
    [platform] = await db
      .insert(platformsTable)
      .values({ name: payload.platformName, slug: payload.slug })
      .returning();
  } else {
    [platform] = await db
      .update(platformsTable)
      .set({ name: payload.platformName })
      .where(eq(platformsTable.id, platform.id))
      .returning();
  }

  // Upsert review
  let [review] = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.slug, payload.slug));

  const reviewData = {
    platformId: platform.id,
    slug: payload.slug,
    status: payload.status ?? "published",
    threatScore: payload.threatScore ?? 0,
    verdict: payload.verdict ?? "",
    summary: payload.summary ?? "",
    heroDescription: payload.heroDescription ?? "",
    warningCallout: payload.warningCallout ?? "",
    investigationDate: payload.investigationDate ? new Date(payload.investigationDate) : new Date(),
    methodologyText: payload.methodologyText ?? "",
    disclaimerText: payload.disclaimerText ?? "",
    wordCount: payload.wordCount ?? 0,
    readingMinutes: payload.readingMinutes ?? 0,
    author: payload.author ?? "Crypto Killer Research Team",
  };

  let action = "created";
  if (!review) {
    [review] = await db.insert(reviewsTable).values(reviewData).returning();
  } else {
    action = "updated";
    [review] = await db
      .update(reviewsTable)
      .set(reviewData)
      .where(eq(reviewsTable.id, review.id))
      .returning();
  }

  const reviewId = review.id;

  // Upsert stats
  const [existingStats] = await db.select().from(reviewStatsTable).where(eq(reviewStatsTable.reviewId, reviewId));
  const statsData = {
    reviewId,
    adCreatives: payload.adCreatives ?? 0,
    countriesTargeted: payload.countriesTargeted ?? 0,
    daysActive: payload.daysActive ?? 0,
    celebritiesAbused: payload.celebritiesAbused ?? 0,
    weeklyVelocity: payload.weeklyVelocity ?? 0,
    firstDetected: payload.firstDetected ?? "",
    lastActive: payload.lastActive ?? "",
  };
  if (!existingStats) {
    await db.insert(reviewStatsTable).values(statsData);
  } else {
    await db.update(reviewStatsTable).set(statsData).where(eq(reviewStatsTable.reviewId, reviewId));
  }

  // Replace related data (delete + re-insert)
  await Promise.all([
    db.delete(redFlagsTable).where(eq(redFlagsTable.reviewId, reviewId)),
    db.delete(funnelStagesTable).where(eq(funnelStagesTable.reviewId, reviewId)),
    db.delete(faqItemsTable).where(eq(faqItemsTable.reviewId, reviewId)),
    db.delete(keyFindingsTable).where(eq(keyFindingsTable.reviewId, reviewId)),
    db.delete(geoTargetsTable).where(eq(geoTargetsTable.reviewId, reviewId)),
  ]);

  await Promise.all([
    payload.redFlags?.length
      ? db.insert(redFlagsTable).values(payload.redFlags.map((f: { emoji: string; title: string; description: string; orderIndex: number }) => ({ ...f, reviewId })))
      : Promise.resolve(),
    payload.funnelStages?.length
      ? db.insert(funnelStagesTable).values(payload.funnelStages.map((s: { stageNumber: number; title: string; description: string; statValue: string; statLabel: string; bullets: string[] }) => ({ ...s, reviewId })))
      : Promise.resolve(),
    payload.faqItems?.length
      ? db.insert(faqItemsTable).values(payload.faqItems.map((f: { question: string; answer: string; orderIndex: number }) => ({ ...f, reviewId })))
      : Promise.resolve(),
    payload.keyFindings?.length
      ? db.insert(keyFindingsTable).values(payload.keyFindings.map((f: { content: string; orderIndex: number }) => ({ ...f, reviewId })))
      : Promise.resolve(),
    payload.geoTargets?.length
      ? db.insert(geoTargetsTable).values(payload.geoTargets.map((g: { region: string; countryCodes: string; orderIndex: number }) => ({ ...g, reviewId })))
      : Promise.resolve(),
  ]);

  req.log.info({ reviewId, slug: payload.slug, action }, "Review synced");
  res.json({ ok: true, reviewId, action });
});

export default router;
