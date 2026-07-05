-- Migration 0009: AI disclosure on reviews + blog posts
-- (2026-07-05 Vercel pipeline audit handoff)
--
-- Adds a nullable `ai_disclosure` text column to both content tables. The
-- Vercel admin pipeline now ships a plain-text 2–4 sentence disclosure on
-- every review and blog content row describing how the piece was produced
-- (AI assistance + human editorial review). The renderers surface it as a
-- muted "How this was created" box near the methodology/byline area. It is
-- deliberately NOT emitted into JSON-LD.
--
-- Nullable with no default: legacy rows that pre-date the pipeline change
-- stay NULL and the box is omitted at render time. Idempotent so Drizzle Kit
-- push converges to the same schema.

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS ai_disclosure text;

COMMENT ON COLUMN reviews.ai_disclosure IS
  'Plain-text AI-assistance disclosure (2-4 sentences) synced from the Vercel admin. Rendered as the "How this was created" box. Null when not synced.';

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS ai_disclosure text;

COMMENT ON COLUMN blog_posts.ai_disclosure IS
  'Plain-text AI-assistance disclosure (2-4 sentences) synced from the Vercel admin. Rendered as the "How this was created" box. Null when not synced.';
