-- Migration: 0006_platform_aggregates.sql
-- Run in the Replit Postgres instance.
--
-- New table that holds the cross-cutting platform statistics articles
-- reference (e.g. "CryptoKiller has tracked X scam brands across Y ad
-- creatives"). Two row sources:
--
--   source = 'vercel-sync'        Pushed periodically from Vercel via
--                                 POST /sync/platform-aggregates. Contains
--                                 totals derived from the full Supabase
--                                 universe (scam_brands, creatives) that
--                                 Replit can't see directly.
--
--   source = 'replit-published'   (Computed at read time, not stored.) The
--                                 row may exist for cache/observability but
--                                 the canonical value is always derived live
--                                 from `SELECT count(*) FROM reviews WHERE
--                                 status = 'published'` so it can't drift.
--
-- The table is keyed by `source` so upserts from Vercel sync are idempotent.
-- Numeric columns are nullable so a partially-populated push doesn't have
-- to backfill every field with zeros (writer prompts treat null as "field
-- missing" and fall back gracefully).
--
-- Idempotent re-run: CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS platform_aggregates (
  id serial PRIMARY KEY,
  source text NOT NULL UNIQUE,
  total_brands_tracked integer,
  total_creatives_analyzed integer,
  total_brands_with_celebrity_abuse integer,
  total_brands_reviewed integer,
  avg_scam_score integer,
  top_velocity_trend text,
  top_scam_brand_name text,
  top_scam_brand_score integer,
  metadata jsonb,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE platform_aggregates IS
  'Cross-cutting platform statistics referenced by article {{platform_stat:KEY}} tokens. Keyed by source — vercel-sync rows are pushed from Vercel via /sync/platform-aggregates; replit-published is derived live from reviews count.';

COMMENT ON COLUMN platform_aggregates.source IS
  'Origin of this aggregate row. Currently: vercel-sync (Vercel/Supabase universe totals) or replit-published (Replit local published-review count). UNIQUE so the sync receiver can ON CONFLICT (source) UPDATE.';

COMMENT ON COLUMN platform_aggregates.total_brands_tracked IS
  'Vercel: count(scam_brands). The full SpyOwl detection universe, not just published reviews.';

COMMENT ON COLUMN platform_aggregates.total_creatives_analyzed IS
  'Vercel: count(creatives). Total ad creatives ingested by the SpyOwl scraper.';

COMMENT ON COLUMN platform_aggregates.total_brands_with_celebrity_abuse IS
  'Vercel: count(scam_brands WHERE total_celebrities > 0). Number of distinct brands using celebrity impersonation.';

COMMENT ON COLUMN platform_aggregates.total_brands_reviewed IS
  'Replit: count(reviews WHERE status = published). Distinct from total_brands_tracked — only the subset CryptoKiller has published a full investigation on. Stored here as a cache; canonical source is always the live query.';

COMMENT ON COLUMN platform_aggregates.metadata IS
  'JSONB catch-all for forward-compatibility — future fields the sync sender adds will land here without a schema migration. Read by token substitution as `metadata.<key>`.';
