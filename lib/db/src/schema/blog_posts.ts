import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blogPostsTable = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull().default(""),
  topicId: text("topic_id").notNull().default(""),
  contentType: text("content_type").notNull().default(""),
  title: text("title").notNull(),
  headline: text("headline").notNull().default(""),
  slug: text("slug").notNull().unique(),
  metaDescription: text("meta_description").notNull().default(""),
  summary: text("summary").notNull().default(""),
  fullArticle: text("full_article").notNull().default(""),
  sections: jsonb("sections").notNull().default([]),
  faq: jsonb("faq").notNull().default([]),
  internalLinks: jsonb("internal_links").notNull().default([]),
  sources: jsonb("sources").notNull().default([]),
  wordCount: integer("word_count").notNull().default(0),
  status: text("status").notNull().default("draft"),
  topicTitle: text("topic_title").notNull().default(""),
  targetKeyword: text("target_keyword").notNull().default(""),
  priorityScore: integer("priority_score").notNull().default(0),
  searchVolume: integer("search_volume").notNull().default(0),
  keywordDifficulty: integer("keyword_difficulty").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  destination: text("destination").notNull().default("blog"),
  url: text("url").notNull().default(""),
  authorPersonaId: text("author_persona_id"),
  heroImageUrl: text("hero_image_url"),
  heroImageAlt: text("hero_image_alt"),
  heroImageCredit: text("hero_image_credit"),
  visualMeta: jsonb("visual_meta").notNull().default([]),

  // ── Schema enrichment (v1) ─────────────────────────────────────────────────
  // These columns mirror the public.content enrichment fields on Supabase and
  // let us emit richer Schema.org @graph nodes: ClaimReview[], HowTo, ItemList,
  // Dataset, Quotation[], Speakable, about[], mentions[], alternativeHeadline,
  // and author sameAs signal (via persona id). See migration in lib/db/migrations
  // and the SSR generator in artifacts/crypto-review/server/prerender.ts.
  alternativeHeadline: text("alternative_headline"),
  aboutSlugs: jsonb("about_slugs").notNull().default([]),
  mentionSlugs: jsonb("mention_slugs").notNull().default([]),
  speakableSelectors: jsonb("speakable_selectors").notNull().default([]),
  citations: jsonb("citations").notNull().default([]),
  dataset: jsonb("dataset"),
  itemList: jsonb("item_list"),
  howTo: jsonb("how_to"),
  quotes: jsonb("quotes").notNull().default([]),
  claims: jsonb("claims").notNull().default([]),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBlogPostSchema = createInsertSchema(blogPostsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPostsTable.$inferSelect;
