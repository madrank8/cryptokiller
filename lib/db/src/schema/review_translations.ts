import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Per-locale translation of a review. One row per (review_id, locale).
// Translations are managed in the Vercel admin and pushed via /api/sync/review
// as `review.translations: [...]`. Local sync uses delete-then-insert so the
// payload is the source of truth — translations unpublished on Vercel
// disappear here on the next sync.
//
// Schema mirrors the incoming payload shape documented in the multilingual
// brief (Phase 2). Field-level nullability matches the brief: any field that
// may be omitted by the translator is nullable; only routing/identity fields
// (review_id, locale, slug, status) are NOT NULL.
//
// `locale` stores the BCP-47 canonical-case value: 'it', 'es', 'de', 'fr',
// 'pt-BR'. URL segments are lowercased at the route boundary (`/pt-br/`) and
// re-normalised to BCP-47 case before the DB lookup. Storing canonical-case
// keeps the value usable directly as the `inLanguage` / `hreflang` attribute.
export const reviewTranslationsTable = pgTable(
  "review_translations",
  {
    id: serial("id").primaryKey(),
    reviewId: integer("review_id").notNull(),
    locale: text("locale").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("published"),

    title: text("title"),
    metaDescription: text("meta_description"),
    headline: text("headline"),
    alternativeHeadline: text("alternative_headline"),
    summary: text("summary"),
    verdict: text("verdict"),
    howItWorks: text("how_it_works"),
    fullArticle: text("full_article"),
    redFlags: jsonb("red_flags"),
    faq: jsonb("faq"),
    keyTakeaways: jsonb("key_takeaways"),
    notForYou: text("not_for_you"),
    protectionSteps: text("protection_steps"),
    methodology: text("methodology"),
    disclaimer: text("disclaimer"),
    expertiseDepth: text("expertise_depth"),

    translationMethod: text("translation_method"),
    translatorName: text("translator_name"),
    translatorCredentials: text("translator_credentials"),
    aiModel: text("ai_model"),
    aiPromptVersion: text("ai_prompt_version"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    wordCount: integer("word_count"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    sourceReviewUpdatedAt: timestamp("source_review_updated_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    reviewLocaleUnique: uniqueIndex("review_translations_review_locale_uq").on(
      t.reviewId,
      t.locale,
    ),
    localeSlugUnique: uniqueIndex("review_translations_locale_slug_uq").on(
      t.locale,
      t.slug,
    ),
    localeSlugIdx: index("review_translations_locale_slug_idx").on(t.locale, t.slug),
  }),
);

export const insertReviewTranslationSchema = createInsertSchema(reviewTranslationsTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertReviewTranslation = z.infer<typeof insertReviewTranslationSchema>;
export type ReviewTranslation = typeof reviewTranslationsTable.$inferSelect;
