-- Migration 0008: fraudulent-ad evidence on reviews
--
-- Adds a nullable `ad_evidence` jsonb column holding structured evidence synced
-- from the admin in the shape:
--   { "images": [{ "geo": "ES", "celebrity": "Name", "url": "https://..." }],
--     "geoCounts": { "ES": 42, "IT": 17 } }
--
-- `images` are fraudulent ad-creative screenshots tagged by target country and
-- the impersonated celebrity; `geoCounts` maps an ISO-3166-1 alpha-2 country
-- code to the number of ads detected there. The review page renders these as
-- the "Evidence: Fraudulent Ad Creatives by Country" section.
--
-- Nullable with no default: legacy rows and brands without scraped evidence
-- stay NULL and the evidence section is omitted at render time. Idempotent so
-- Drizzle Kit push converges to the same schema.

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS ad_evidence jsonb;

COMMENT ON COLUMN reviews.ad_evidence IS
  'Structured fraudulent-ad evidence: { images: [{geo, celebrity, url}], geoCounts: {GEO: count} }. Null when not synced.';
