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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBlogPostSchema = createInsertSchema(blogPostsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPostsTable.$inferSelect;
