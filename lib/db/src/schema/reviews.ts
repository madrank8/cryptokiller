import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  platformId: integer("platform_id").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("draft"),
  threatScore: integer("threat_score").notNull().default(0),
  verdict: text("verdict").notNull().default(""),
  summary: text("summary").notNull().default(""),
  heroDescription: text("hero_description").notNull().default(""),
  warningCallout: text("warning_callout").notNull().default(""),
  investigationDate: timestamp("investigation_date", { withTimezone: true }).notNull().defaultNow(),
  methodologyText: text("methodology_text").notNull().default(""),
  disclaimerText: text("disclaimer_text").notNull().default(""),
  wordCount: integer("word_count").notNull().default(0),
  readingMinutes: integer("reading_minutes").notNull().default(0),
  author: text("author").notNull().default("Crypto Killer Research Team"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
