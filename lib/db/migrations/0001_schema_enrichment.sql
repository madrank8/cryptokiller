-- ─────────────────────────────────────────────────────────────────────────────
-- Schema enrichment v1 — add 12 columns to public.blog_posts
-- ─────────────────────────────────────────────────────────────────────────────
-- These columns mirror the Supabase public.content enrichment fields and are
-- sourced from the /api/sync/blog webhook (artifacts/api-server/src/routes/
-- blog-sync.ts). They let the SSR pipeline (artifacts/crypto-review/server/
-- prerender.ts) emit richer Schema.org @graph nodes per blog post:
--
--   • about[]                — core topical entities (schema.org Thing refs)
--   • mentions[]             — supporting named entities (people, orgs, events)
--   • claims[]               — ClaimReview nodes for fact-check signals
--   • item_list              — ItemList/HowTo candidates (e.g. "7 celebrity
--                              scams" ranked list, "how to verify" steps)
--   • how_to                 — HowTo schema (used by investigation-protocol posts)
--   • dataset                — Dataset ref for original CryptoKiller data releases
--   • quotes[]               — Quotation nodes for expert pullquotes
--   • speakable_selectors[]  — Speakable CSS selectors (voice assistants, AEO)
--   • citations[]            — typed citation[] for the Article node
--   • alternative_headline   — SEO variant headline (Article.alternativeHeadline)
--   • author_persona_id      — already exists; no-op here but documented
--
-- This migration is idempotent — safe to run multiple times. Every column uses
-- IF NOT EXISTS. Drizzle Kit push will also converge to this schema from the
-- TypeScript definitions in lib/db/src/schema/blog_posts.ts.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS alternative_headline  text,
  ADD COLUMN IF NOT EXISTS about_slugs           jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mention_slugs         jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS speakable_selectors   jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS citations             jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dataset               jsonb,
  ADD COLUMN IF NOT EXISTS item_list             jsonb,
  ADD COLUMN IF NOT EXISTS how_to                jsonb,
  ADD COLUMN IF NOT EXISTS quotes                jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS claims                jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Useful indexes for slug-based entity lookup (used by /blog/[slug] SSR only,
-- so we keep the index set minimal; add more if query patterns change).
CREATE INDEX IF NOT EXISTS idx_blog_posts_about_slugs   ON blog_posts USING gin (about_slugs);
CREATE INDEX IF NOT EXISTS idx_blog_posts_mention_slugs ON blog_posts USING gin (mention_slugs);

COMMENT ON COLUMN blog_posts.alternative_headline IS 'SEO headline variant (schema.org Article.alternativeHeadline)';
COMMENT ON COLUMN blog_posts.about_slugs          IS 'Core topical entities as string slugs; resolved to Wikidata/schema.org refs at render time';
COMMENT ON COLUMN blog_posts.mention_slugs        IS 'Supporting named entities; same resolver as about_slugs';
COMMENT ON COLUMN blog_posts.speakable_selectors  IS 'CSS selectors for schema.org SpeakableSpecification (voice/AEO surfaces)';
COMMENT ON COLUMN blog_posts.citations            IS 'Array of {title, url, type?, authors?, publisher?, date?} — typed schema.org citation[]';
COMMENT ON COLUMN blog_posts.dataset              IS 'Single schema.org Dataset node (for original data releases like creative indexes)';
COMMENT ON COLUMN blog_posts.item_list            IS 'Single schema.org ItemList node (ranked lists: 7 celebs, top brands, etc.)';
COMMENT ON COLUMN blog_posts.how_to               IS 'Single schema.org HowTo node (verification/recovery procedures)';
COMMENT ON COLUMN blog_posts.quotes               IS 'Array of schema.org Quotation nodes (expert pullquotes)';
COMMENT ON COLUMN blog_posts.claims               IS 'Array of schema.org ClaimReview nodes (fact-check signals, rating 1-5)';
