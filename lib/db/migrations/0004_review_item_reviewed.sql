-- Migration: 0004_review_item_reviewed.sql
-- Run in the Replit Postgres instance.
--
-- Counterpart to Vercel's add_item_reviewed_column migration (Task 7C).
-- Adds the writer-emitted item_reviewed JSONB field so Replit's
-- /sync/review ingest can persist it and prerender.ts can read it
-- instead of falling back to the synthesized Service node.
--
-- Shape (enforced by Vercel sync-shape.normalizeItemReviewed):
--   {
--     type: "FinancialProduct" | "Service" | "SoftwareApplication" | "Organization",
--     name: string,
--     description: string | null,
--     url: string | null,
--     alternateName: string[] | null,
--     sameAs: string[] | null
--   }
--
-- Idempotent re-run: ADD COLUMN IF NOT EXISTS.

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS item_reviewed JSONB;

COMMENT ON COLUMN reviews.item_reviewed IS
  'Typed entity this review is ABOUT (writer-emitted via Vercel sync). Shape: { type: FinancialProduct|Service|SoftwareApplication|Organization, name, description, url?, alternateName?, sameAs? }. Consumed by buildItemReviewedJsonLdNode (reviewItemReviewedSchema.ts) / prerender for @id=#item-reviewed; when null, falls back to a synthetic Service from platformName + tier.';
