-- Migration: 0007_review_translations.sql
-- Run in the Replit Postgres instance.
--
-- Adds the per-locale translation table for reviews. Translations are
-- authored upstream in Supabase (public.review_translations) by the
-- Vercel admin pipeline; runSupabaseSync mirrors them into Replit so
-- the SSR renderer has a single Postgres data source. The SSR router
-- maps `/fr/review/<slug>` → `(slug, locale='fr')` lookup.
--
-- Field set mirrors the columns the SSR renderer reads from `reviews`
-- for the prose-bearing surface area. Stats / tier / hero image /
-- persona / schema enrichment fields stay on the master row —
-- translations localize text, never structure.
--
-- Keyed by (slug, locale): slug matches reviews.slug, so the
-- translation rides on the same slug as the master review. We do not
-- carry a foreign key to reviews.id because Supabase uses uuid PKs and
-- Replit uses serial PKs; slug is the only cross-system stable
-- identifier.
--
-- Idempotent re-run: CREATE TABLE IF NOT EXISTS + CREATE UNIQUE INDEX
-- IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS review_translations (
  id serial PRIMARY KEY,
  slug text NOT NULL,
  locale text NOT NULL,
  status text NOT NULL DEFAULT 'draft',

  title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  alternative_headline text NOT NULL DEFAULT '',

  summary text NOT NULL DEFAULT '',
  how_it_works text NOT NULL DEFAULT '',
  verdict text NOT NULL DEFAULT '',
  full_article text NOT NULL DEFAULT '',
  not_for_you text NOT NULL DEFAULT '',
  protection_steps text NOT NULL DEFAULT '',
  methodology text NOT NULL DEFAULT '',
  disclaimer text NOT NULL DEFAULT '',
  expertise_depth text NOT NULL DEFAULT '',

  red_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_takeaways jsonb NOT NULL DEFAULT '[]'::jsonb,

  translation_method text,
  ai_model text,
  ai_prompt_version text,
  translator_name text,
  translator_credentials text,

  source_review_updated_at timestamptz,
  published_at timestamptz,
  word_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS review_translations_slug_locale_idx
  ON review_translations (slug, locale);

COMMENT ON TABLE review_translations IS
  'Per-locale translation of a published review. Mirrors Supabase public.review_translations. Keyed by (slug, locale); slug matches reviews.slug. Master review stays in `reviews` (locale=en, is_master=true upstream); translations only localize the prose surface.';

COMMENT ON COLUMN review_translations.slug IS
  'Matches reviews.slug. The SSR router maps `/fr/review/<slug>` → (slug, locale=fr) row lookup. Slug is the cross-system stable identifier because Supabase reviews.id is uuid and Replit reviews.id is serial.';

COMMENT ON COLUMN review_translations.locale IS
  'BCP-47 language tag — currently `fr`, `es`. Master English stays on the reviews table itself; do NOT insert locale=en rows here.';

COMMENT ON COLUMN review_translations.status IS
  'Only `published` rows are served by the SSR. Mirrors the same gating as reviews.status.';

COMMENT ON COLUMN review_translations.translator_name IS
  'Surfaced in the byline when present. Falls back to the master review persona when null.';

COMMENT ON COLUMN review_translations.source_review_updated_at IS
  'Snapshot of reviews.updated_at at translation time. Lets the SSR / sync detect stale translations whose source has been re-edited since.';
