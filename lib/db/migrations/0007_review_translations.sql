-- 0007_review_translations.sql
-- Per-locale translation of a review. One row per (review_id, locale).
-- Mirrors lib/db/src/schema/review_translations.ts.
-- Idempotent: safe to run repeatedly.

CREATE TABLE IF NOT EXISTS review_translations (
  id                          serial PRIMARY KEY,
  review_id                   integer NOT NULL,
  locale                      text NOT NULL,
  slug                        text NOT NULL,
  status                      text NOT NULL DEFAULT 'published',

  title                       text,
  meta_description            text,
  headline                    text,
  alternative_headline        text,
  summary                     text,
  verdict                     text,
  how_it_works                text,
  full_article                text,
  red_flags                   jsonb,
  faq                         jsonb,
  key_takeaways               jsonb,
  not_for_you                 text,
  protection_steps            text,
  methodology                 text,
  disclaimer                  text,
  expertise_depth             text,

  translation_method          text,
  translator_name             text,
  translator_credentials      text,
  ai_model                    text,
  ai_prompt_version           text,
  reviewed_at                 timestamptz,
  word_count                  integer,
  published_at                timestamptz,
  source_review_updated_at    timestamptz,
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS review_translations_review_locale_uq
  ON review_translations (review_id, locale);

CREATE UNIQUE INDEX IF NOT EXISTS review_translations_locale_slug_uq
  ON review_translations (locale, slug);

CREATE INDEX IF NOT EXISTS review_translations_locale_slug_idx
  ON review_translations (locale, slug);
