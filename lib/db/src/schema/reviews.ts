import { pgTable, text, serial, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
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

// ─── Schema enrichment types (migration 0003) ───
// Shapes mirror lib/blogSchemaEnrichment.ts so the same builder functions
// consume review + blog_post rows interchangeably. `unknown` at the builder
// input boundary tolerates writer drift; these Drizzle types are for the
// admin/sync side where the payload shape is authoritative.

// schema.org citation[] (typed).
type Citation = {
  title?: string;
  url: string;
  type?: "NewsArticle" | "ScholarlyArticle" | "Report" | "WebPage" | "GovernmentService";
  publisher?: string | null;
  datePublished?: string | null;
  authors?: string[];
  date?: string;
};

// schema.org ClaimReview node (fact-check).
type Claim = {
  claimReviewed: string;
  ratingValue: 1 | 2 | 3 | 4 | 5;
  ratingLabel: "False" | "Mostly False" | "Misleading" | "Partly True" | "Mostly True" | "True";
  originator?: string;
};

// schema.org HowTo node.
type HowTo = {
  name: string;
  description: string;
  totalTime?: string | null;
  steps: Array<{ name: string; text: string }>;
};

// schema.org ItemList entry.
type ItemListEntry = {
  name: string;
  description: string;
  entitySlug?: string | null;
};

// schema.org Dataset node.
type Dataset = {
  name: string;
  description: string;
  url?: string | null;
  datePublished?: string | null;
  variableMeasured?: string[];
};

// Typed entity the review is ABOUT. Writer emits; Vercel sync-shape
// normalises against the type whitelist below. Stored so prerender can
// emit a proper FinancialProduct/Service/SoftwareApplication/Organization
// node with @id instead of falling back to a synthesised Service from
// platformName alone. See artifacts/crypto-review/server/prerender.ts
// `buildItemReviewedJsonLdNode` in crypto-review/src/lib/reviewItemReviewedSchema.ts.
type ItemReviewed = {
  type: "FinancialProduct" | "Service" | "SoftwareApplication" | "Organization";
  name: string;
  description: string | null;
  url: string | null;
  alternateName: string[] | null;
  sameAs: string[] | null;
};

// schema.org Quotation node.
type Quote = {
  text: string;
  speakerName: string;
  speakerSlug?: string | null;
  citationUrl?: string | null;
  publishedDate?: string | null;
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
  // ── Long-form article body ──
  // Writer-emitted HTML article rendered inline on /review/<slug>. Sync
  // payload includes this as `full_article`; if absent we keep an empty
  // string and the prerender falls back to structured sections.
  fullArticle: text("full_article").notNull().default(""),

  // ── Tier metadata (added 2026-04-21, migration 0003) ──
  // Populated by the Vercel /api/sync/review webhook from sync-shape's
  // classifyThreat() call. frameAsScam=true only for confirmed+high tiers
  // (~top 0.42% of brands by scam_score after the PR #3 recalibration).
  // These drive the SSR title/H1/badge/verdict rendering and the
  // review-schema itemReviewed/reviewRating polarity.
  threatTier: text("threat_tier"),
  threatLabel: text("threat_label"),
  threatBadge: text("threat_badge"),
  frameAsScam: boolean("frame_as_scam").notNull().default(false),

  // ── Schema enrichment (added 2026-04-21, migration 0003) ──
  // Powers the ClaimReview, HowTo, ItemList, Dataset, Quotation, and
  // Speakable schema nodes via the builders in lib/blogSchemaEnrichment.ts.
  // about_slugs/mention_slugs are resolved against ENTITY_REGISTRY at
  // render time so the entity graph cross-references stay consistent
  // across reviews and blog posts.
  authorPersonaId: text("author_persona_id"),
  alternativeHeadline: text("alternative_headline"),
  targetKeyword: text("target_keyword"),
  aboutSlugs: jsonb("about_slugs").$type<string[]>().notNull().default([]),
  mentionSlugs: jsonb("mention_slugs").$type<string[]>().notNull().default([]),
  speakableSelectors: jsonb("speakable_selectors").$type<string[]>().notNull().default([]),
  citations: jsonb("citations").$type<Citation[]>().notNull().default([]),
  dataset: jsonb("dataset").$type<Dataset | null>(),
  itemReviewed: jsonb("item_reviewed").$type<ItemReviewed | null>(),
  itemList: jsonb("item_list").$type<ItemListEntry[] | null>(),
  howTo: jsonb("how_to").$type<HowTo | null>(),
  quotes: jsonb("quotes").$type<Quote[]>().notNull().default([]),
  claims: jsonb("claims").$type<Claim[]>().notNull().default([]),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
