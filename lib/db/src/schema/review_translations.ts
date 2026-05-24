import { pgTable, text, serial, timestamp, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

// Per-locale translation of a published review. Mirrors the Supabase
// public.review_translations table (the source of truth — translations
// are authored upstream by the Vercel admin pipeline, then synced into
// Replit by runSupabaseSync alongside the master review rows).
//
// Keyed by (slug, locale) — slug matches reviewsTable.slug, so the
// translation rides on the same slug as the master review and the SSR
// router maps `/fr/review/<slug>` directly. We do NOT join on
// reviewsTable.id because the two databases assign different integer
// primary keys (Supabase: uuid, Replit: serial), and slug is the only
// cross-system stable identifier.
//
// Field set mirrors the columns the SSR renderer reads from `reviews`
// for the prose-bearing surface area (headline, summary, verdict,
// full_article, methodology, etc.). Stats / tier / hero image / persona
// / schema enrichment fields stay on the master row — translations
// localize text, never structure.
export const reviewTranslationsTable = pgTable(
  "review_translations",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    locale: text("locale").notNull(),
    status: text("status").notNull().default("draft"),

    // SEO surface — page title, meta description, headline, alternative
    // headline. Used to compute the per-locale <title> + meta description
    // + JSON-LD headline/alternativeHeadline.
    title: text("title").notNull().default(""),
    metaDescription: text("meta_description").notNull().default(""),
    headline: text("headline").notNull().default(""),
    alternativeHeadline: text("alternative_headline").notNull().default(""),

    // Editorial body fields. summary feeds the investigation-summary
    // section; how_it_works seeds the funnel stages when full_article is
    // empty; verdict drives the page lede + JSON-LD Review.reviewBody;
    // full_article is the long-form HTML body (writer-emitted, same
    // dialect as reviews.full_article).
    summary: text("summary").notNull().default(""),
    howItWorks: text("how_it_works").notNull().default(""),
    verdict: text("verdict").notNull().default(""),
    fullArticle: text("full_article").notNull().default(""),
    notForYou: text("not_for_you").notNull().default(""),
    protectionSteps: text("protection_steps").notNull().default(""),
    methodology: text("methodology").notNull().default(""),
    disclaimer: text("disclaimer").notNull().default(""),
    expertiseDepth: text("expertise_depth").notNull().default(""),

    // Localized JSON arrays. Shape mirrors reviews.red_flags / reviews.faq
    // / reviews.key_takeaways so the SSR reuses the same iteration code.
    redFlags: jsonb("red_flags").notNull().default([]),
    faq: jsonb("faq").notNull().default([]),
    keyTakeaways: jsonb("key_takeaways").notNull().default([]),

    // Provenance — surfaced in the byline when present so the page
    // attributes the translation to the right voice (e.g. "Translated by
    // X" vs. the master author's persona).
    translationMethod: text("translation_method"),
    aiModel: text("ai_model"),
    aiPromptVersion: text("ai_prompt_version"),
    translatorName: text("translator_name"),
    translatorCredentials: text("translator_credentials"),

    sourceReviewUpdatedAt: timestamp("source_review_updated_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    wordCount: integer("word_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    slugLocaleIdx: uniqueIndex("review_translations_slug_locale_idx").on(t.slug, t.locale),
  }),
);

export type ReviewTranslation = typeof reviewTranslationsTable.$inferSelect;
export type InsertReviewTranslation = typeof reviewTranslationsTable.$inferInsert;
