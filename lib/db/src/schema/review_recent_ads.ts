import { pgTable, text, serial, timestamp, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewRecentAdsTable = pgTable(
  "review_recent_ads",
  {
    id: serial("id").primaryKey(),
    reviewId: integer("review_id").notNull(),
    creativeId: text("creative_id").notNull(),
    offerName: text("offer_name"),
    celebrityName: text("celebrity_name"),
    geo: text("geo"),
    landLanguage: text("land_language"),
    isVideo: boolean("is_video").notNull().default(false),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    spyowlCreatedAt: timestamp("spyowl_created_at", { withTimezone: true }),
    mainText: text("main_text"),
    linkText: text("link_text"),
    linkDomain: text("link_domain"),
    postUrl: text("post_url"),
    fpLink: text("fp_link"),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    reviewCreativeUnique: uniqueIndex("review_recent_ads_review_creative_idx").on(t.reviewId, t.creativeId),
  }),
);

export const insertReviewRecentAdSchema = createInsertSchema(reviewRecentAdsTable).omit({ id: true, createdAt: true });
export type InsertReviewRecentAd = z.infer<typeof insertReviewRecentAdSchema>;
export type ReviewRecentAd = typeof reviewRecentAdsTable.$inferSelect;
