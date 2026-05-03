import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Cross-cutting platform statistics referenced by article {{platform_stat:KEY}} tokens.
// Keyed by `source` so upserts from /sync/platform-aggregates are idempotent.
// See lib/db/migrations/0006_platform_aggregates.sql for column-level docs.
export const platformAggregatesTable = pgTable("platform_aggregates", {
  id: serial("id").primaryKey(),
  source: text("source").notNull().unique(),
  totalBrandsTracked: integer("total_brands_tracked"),
  totalCreativesAnalyzed: integer("total_creatives_analyzed"),
  totalBrandsWithCelebrityAbuse: integer("total_brands_with_celebrity_abuse"),
  totalBrandsReviewed: integer("total_brands_reviewed"),
  avgScamScore: integer("avg_scam_score"),
  topVelocityTrend: text("top_velocity_trend"),
  topScamBrandName: text("top_scam_brand_name"),
  topScamBrandScore: integer("top_scam_brand_score"),
  metadata: jsonb("metadata"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlatformAggregatesSchema = createInsertSchema(platformAggregatesTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertPlatformAggregates = z.infer<typeof insertPlatformAggregatesSchema>;
export type PlatformAggregates = typeof platformAggregatesTable.$inferSelect;
