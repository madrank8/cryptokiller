import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewStatsTable = pgTable("review_stats", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull().unique(),
  adCreatives: integer("ad_creatives").notNull().default(0),
  countriesTargeted: integer("countries_targeted").notNull().default(0),
  daysActive: integer("days_active").notNull().default(0),
  celebritiesAbused: integer("celebrities_abused").notNull().default(0),
  weeklyVelocity: integer("weekly_velocity").notNull().default(0),
  firstDetected: text("first_detected").notNull().default(""),
  lastActive: text("last_active").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewStatsSchema = createInsertSchema(reviewStatsTable).omit({ id: true, createdAt: true });
export type InsertReviewStats = z.infer<typeof insertReviewStatsSchema>;
export type ReviewStats = typeof reviewStatsTable.$inferSelect;
