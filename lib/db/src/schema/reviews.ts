import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Rich visual content attached to a review.
// content_images: inline images placed between sections
type ContentImage = {
  url: string;
  alt: string;
  credit?: string | null;
  creditUrl?: string | null;
  placement?: string | null;
};

// visual_meta: polish-pipeline visual placeholders (charts/diagrams/infographics).
// Each entry reports whether the generation succeeded and carries the resolved
// asset URL when it did. Items where succeeded=false are skipped by the SSR.
type VisualMeta = {
  type: "IMAGE" | "CHART" | "DIAGRAM" | "INFOGRAPHIC";
  url: string | null;
  altText: string;
  description: string;
  succeeded: boolean;
  originalType?: string;
  width?: number | null;
  height?: number | null;
};

// Typed citation entry. `type` is free-form but in practice one of
// regulatory | news | investigation | research | primary.
type ReviewSource = {
  title: string;
  url: string;
  type?: string;
  accessed_date?: string;
  authors?: string[];
  publisher?: string;
  date?: string;
};

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
  metaDescription: text("meta_description").notNull().default(""),
  wordCount: integer("word_count").notNull().default(0),
  readingMinutes: integer("reading_minutes").notNull().default(0),
  author: text("author").notNull().default("Crypto Killer Research Team"),

  // ── Rich content columns (added 2026-04-21, migration 0002) ──
  // These back the hero image, inline images, chart metadata, sources list,
  // protection-steps section, "not for you" qualifier, and expertise-depth
  // block that the Vercel admin's writer+polish pipeline produces. Before
  // this migration these were dropped silently by the sync webhook.
  heroImageUrl: text("hero_image_url"),
  heroImageAlt: text("hero_image_alt"),
  contentImages: jsonb("content_images").$type<ContentImage[]>().notNull().default([]),
  visualMeta: jsonb("visual_meta").$type<VisualMeta[]>().notNull().default([]),
  protectionSteps: text("protection_steps").notNull().default(""),
  sources: jsonb("sources").$type<ReviewSource[]>().notNull().default([]),
  notForYou: text("not_for_you").notNull().default(""),
  expertiseDepth: text("expertise_depth").notNull().default(""),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
