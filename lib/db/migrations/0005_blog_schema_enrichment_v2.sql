-- ──────────────────────────────────────────────────────────────────────────
-- Migration 0005: Blog schema enrichment v2 — full Schema.org entity columns
--
-- Mirror of the Vercel-side migration on Supabase's `content` table. Adds
-- `about` and `mentions` jsonb columns to the Replit-side `blog_posts`
-- table so the SSR renderer (artifacts/crypto-review/server/prerender.ts)
-- can read full Schema.org entity payloads directly without re-running
-- entity resolution against the in-renderer ENTITY_REGISTRY.
--
-- Background:
--   The aux writer on the Vercel pipeline emits high-level slug-based data
--   (about_slugs[], mention_slugs[]). The renderer historically resolved
--   those slugs through a 23-entity registry, dropping any unknown slugs
--   silently — losing 14 of 16 mentions on a real article.
--
--   Schema enrichment v2 moves entity resolution to the Vercel pipeline
--   side via lib/schema-enrichment-resolver.js with an 84-entity registry
--   in lib/wikidata-registry.js. The pipeline writes complete Schema.org
--   entity payloads to dedicated jsonb columns. The renderer reads them
--   verbatim — no in-renderer filtering.
--
-- Backward compatibility:
--   blog_posts.about_slugs and .mention_slugs (added in 0001) remain
--   populated by the v2 pipeline. The renderer prefers the new full-entity
--   columns; legacy rows that pre-date the v2 pipeline fall back to slug
--   resolution against the in-renderer ENTITY_REGISTRY.
--
-- Drizzle:
--   The matching schema definition is in lib/db/src/schema/blog_posts.ts.
--   Running `pnpm --filter @workspace/db run push` after merging the
--   Drizzle schema change will apply the same column additions; this
--   raw SQL is provided as an auditable record of the change for
--   environments that bypass Drizzle's push.
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS about jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mentions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Index for jsonb querying — enables efficient lookups like
--   SELECT slug FROM blog_posts WHERE mentions @> '[{"name":"Coinbase"}]'
--   SELECT slug FROM blog_posts WHERE about @> '[{"@id":"https://cryptokiller.org/topics/pig-butchering-scam#topic"}]'
CREATE INDEX IF NOT EXISTS idx_blog_posts_about_gin    ON blog_posts USING gin (about);
CREATE INDEX IF NOT EXISTS idx_blog_posts_mentions_gin ON blog_posts USING gin (mentions);
