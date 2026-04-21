-- ─────────────────────────────────────────────────────────────────────────────
-- Review schema enrichment — add 16 columns to public.reviews
-- ─────────────────────────────────────────────────────────────────────────────
-- Mirrors the enrichment surface that migration 0001 added to public.blog_posts,
-- plus adds 4 tier-metadata columns that land from the Vercel /api/sync/review
-- webhook (artifacts/api-server/src/routes/sync.ts). Before this migration:
--
--   • The sync webhook was receiving threat_tier / threat_label / threat_badge /
--     frame_as_scam from the Vercel sync-shape, but had nowhere to persist them,
--     so the prerender fell back to `Threat Score 0/100` in the <title> and
--     hardcoded "Scam Review" label on every page regardless of tier.
--
--   • The sync webhook was receiving 12 schema enrichment fields (about_slugs,
--     mention_slugs, speakable_selectors, citations, dataset, item_list, how_to,
--     quotes, claims, author_persona_id, alternative_headline, target_keyword)
--     from the writer pipeline, but had nowhere to persist them. Prerender's
--     renderReview() function could not call the blogSchemaEnrichment builders
--     (buildClaimReviews, buildItemList, buildHowTo, buildDataset, buildQuotations,
--     buildSpeakable, resolveAbout, resolveMentions, buildCitations) because the
--     input fields did not exist on the review row.
--
-- ── Tier metadata (4 columns) ──
--
--   • threat_tier    — one of: confirmed | high | elevated | watchlist | low
--   • threat_label   — human-readable label ("Confirmed Scam", "Low Signal", …)
--   • threat_badge   — short badge text for chip rendering ("SCAM", "CAUTION", …)
--   • frame_as_scam  — boolean; true only for confirmed+high tiers (~top 0.42%)
--
-- ── Schema enrichment (12 columns) ──
--
--   Columns mirror the blog_posts enrichment surface so the same builders
--   (lib/blogSchemaEnrichment.ts) work on both entity types. Ownership layer
--   for each:
--
--     • author_persona_id      — one of {webb, ortiz, krebs}; PR2 default webb
--                                 for frameAsScam=true, ortiz otherwise
--     • alternative_headline   — schema.org Article.alternativeHeadline (≤110c)
--     • target_keyword         — schema.org Article.keywords (primary keyword)
--     • about_slugs[]          — core topical entities; resolveAbout()
--     • mention_slugs[]        — supporting named entities; resolveMentions()
--     • speakable_selectors[]  — CSS selectors for SpeakableSpecification
--     • citations[]            — typed schema.org citation[] for the Article node
--     • dataset                — single Dataset node for original data releases
--     • item_list              — single ItemList node (ranked lists, listicles)
--     • how_to                 — single HowTo node (protection protocols)
--     • quotes[]               — Quotation nodes (expert pullquotes)
--     • claims[]               — ClaimReview nodes (fact-check signals)
--
-- ── Idempotence ──
--
-- Every column uses ADD COLUMN IF NOT EXISTS. Safe to run multiple times.
-- Drizzle Kit push will converge to this schema from the TypeScript definitions
-- in lib/db/src/schema/reviews.ts.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE reviews
  -- Tier metadata
  ADD COLUMN IF NOT EXISTS threat_tier           text,
  ADD COLUMN IF NOT EXISTS threat_label          text,
  ADD COLUMN IF NOT EXISTS threat_badge          text,
  ADD COLUMN IF NOT EXISTS frame_as_scam         boolean NOT NULL DEFAULT false,

  -- Schema enrichment
  ADD COLUMN IF NOT EXISTS author_persona_id     text,
  ADD COLUMN IF NOT EXISTS alternative_headline  text,
  ADD COLUMN IF NOT EXISTS target_keyword        text,
  ADD COLUMN IF NOT EXISTS about_slugs           jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mention_slugs         jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS speakable_selectors   jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS citations             jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dataset               jsonb,
  ADD COLUMN IF NOT EXISTS item_list             jsonb,
  ADD COLUMN IF NOT EXISTS how_to                jsonb,
  ADD COLUMN IF NOT EXISTS quotes                jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS claims                jsonb NOT NULL DEFAULT '[]'::jsonb;

-- GIN indexes for slug-based entity lookup (match the blog_posts pattern
-- from 0001). These speed up the resolver functions in blogSchemaEnrichment
-- when the registry grows past ~100 entries. Keep index set minimal; add
-- more as query patterns evolve.
CREATE INDEX IF NOT EXISTS idx_reviews_about_slugs   ON reviews USING gin (about_slugs);
CREATE INDEX IF NOT EXISTS idx_reviews_mention_slugs ON reviews USING gin (mention_slugs);

-- Column documentation (mirrors blog_posts 0001 for easy grep).
COMMENT ON COLUMN reviews.threat_tier          IS 'Severity tier from classifyThreat(): confirmed|high|elevated|watchlist|low';
COMMENT ON COLUMN reviews.threat_label         IS 'Human-readable tier label ("Confirmed Scam", "Low Signal")';
COMMENT ON COLUMN reviews.threat_badge         IS 'Short chip/badge text ("SCAM", "CAUTION", "WATCHLIST")';
COMMENT ON COLUMN reviews.frame_as_scam        IS 'True only for confirmed+high tiers (~top 0.42% by scam_score); gates declarative scam language';
COMMENT ON COLUMN reviews.author_persona_id    IS 'Writer persona: webb (threat-forward), ortiz (prevention/consumer), krebs (deep-dive investigation)';
COMMENT ON COLUMN reviews.alternative_headline IS 'schema.org Article.alternativeHeadline — SEO headline variant (≤110 chars)';
COMMENT ON COLUMN reviews.target_keyword       IS 'schema.org Article.keywords — primary target keyword for this review';
COMMENT ON COLUMN reviews.about_slugs          IS 'Core topical entities as slugs; resolved via ENTITY_REGISTRY at render time';
COMMENT ON COLUMN reviews.mention_slugs        IS 'Supporting named entities; same resolver as about_slugs';
COMMENT ON COLUMN reviews.speakable_selectors  IS 'CSS selectors for schema.org SpeakableSpecification (voice assistants, AEO)';
COMMENT ON COLUMN reviews.citations            IS 'Typed schema.org citation[] array for the Article node';
COMMENT ON COLUMN reviews.dataset              IS 'Single schema.org Dataset node (for CryptoKiller original data releases)';
COMMENT ON COLUMN reviews.item_list            IS 'Single schema.org ItemList node (ranked lists)';
COMMENT ON COLUMN reviews.how_to               IS 'Single schema.org HowTo node (protection/verification procedures)';
COMMENT ON COLUMN reviews.quotes               IS 'Array of schema.org Quotation nodes (expert pullquotes)';
COMMENT ON COLUMN reviews.claims               IS 'Array of schema.org ClaimReview nodes (fact-check signals, rating 1-5)';
