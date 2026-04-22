import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

/**
 * Short-lived admin endpoints for one-off maintenance. Every route here is
 * gated by SYNC_SECRET (same shared secret used by the blog/review sync
 * webhooks) so nothing is reachable from the public internet without the
 * token.
 *
 * This module exists to patch schema_enrichment fields on blog_posts rows
 * that went stale after a round of architecture changes (the Vercel admin's
 * Sync-to-Live was silently writing to a different DB than production was
 * reading from — most likely Replit's default per-environment Postgres
 * isolation). Delete the whole file after the one-off patch lands.
 */

const router: IRouter = Router();

function requireAuth(req: import("express").Request, res: import("express").Response): boolean {
  const expected = process.env.SYNC_SECRET;
  const auth = req.headers.authorization;
  if (!expected || !auth || auth !== `Bearer ${expected}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * GET /api/admin/db-info
 * Returns connection host + NOW() + the updated_at of the sentinel blog row.
 * Confirms which database the production runtime is actually reading from.
 */
router.get("/admin/db-info", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  try {
    const client = await pool.connect();
    try {
      const host = await client.query(
        "SELECT inet_server_addr() as host, current_database() as database, now() as now_ts",
      );
      const sentinel = await client.query(
        "SELECT slug, updated_at, alternative_headline FROM blog_posts WHERE slug = $1",
        ["celebrities-promoting-crypto-scams"],
      );
      res.json({
        ok: true,
        connection: host.rows[0],
        sentinel: sentinel.rows[0] ?? null,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/admin/patch-blog-enrichment
 * Body: { slug: string, fields: { alternative_headline, about_slugs, ... } }
 * Runs an UPDATE statement against the pool (same pool that serves /api/blog/:slug).
 *
 * Only whitelisted columns are accepted so this can't be used to poke arbitrary
 * data into the table. All jsonb values are passed through pg's parameterised
 * binding so injection isn't a risk.
 */
const PATCHABLE_COLUMNS = [
  "alternative_headline",
  "about_slugs",
  "mention_slugs",
  "speakable_selectors",
  "citations",
  "claims",
  "quotes",
  "how_to",
  "item_list",
  "dataset",
] as const;

type PatchableColumn = typeof PATCHABLE_COLUMNS[number];

// `alternative_headline` is a plain TEXT column; everything else is JSONB.
// Node-postgres sends raw JS values through, but Postgres JSONB columns
// require a JSON string, not a JS object — so we serialise those explicitly.
const TEXT_COLUMNS = new Set<PatchableColumn>(["alternative_headline"]);

router.post("/admin/patch-blog-enrichment", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  try {
    const { slug, fields } = req.body ?? {};
    if (typeof slug !== "string" || !slug) {
      res.status(400).json({ error: "Missing slug" });
      return;
    }
    if (!fields || typeof fields !== "object") {
      res.status(400).json({ error: "Missing fields object" });
      return;
    }

    const accepted: PatchableColumn[] = [];
    const values: unknown[] = [];
    const setClauses: string[] = [];

    for (const col of PATCHABLE_COLUMNS) {
      if (col in fields) {
        accepted.push(col);
        const raw = fields[col];
        // TEXT columns take the raw value; JSONB columns need JSON.stringify
        // (pg would otherwise send "[object Object]" which Postgres rejects).
        // Null stays null for both kinds so a field can be explicitly cleared.
        const bind =
          raw === null || raw === undefined
            ? null
            : TEXT_COLUMNS.has(col)
              ? raw
              : JSON.stringify(raw);
        values.push(bind);
        // $1 = slug (WHERE), so column placeholders start at $2
        setClauses.push(`${col} = $${values.length + 1}`);
      }
    }

    if (accepted.length === 0) {
      res.status(400).json({ error: "No patchable fields provided", patchable: PATCHABLE_COLUMNS });
      return;
    }

    const query = `
      UPDATE blog_posts
      SET ${setClauses.join(", ")}, updated_at = NOW()
      WHERE slug = $1
      RETURNING slug, updated_at, alternative_headline,
        jsonb_array_length(COALESCE(about_slugs, '[]'::jsonb)) as about_n,
        jsonb_array_length(COALESCE(mention_slugs, '[]'::jsonb)) as mention_n,
        jsonb_array_length(COALESCE(citations, '[]'::jsonb)) as cite_n,
        jsonb_array_length(COALESCE(claims, '[]'::jsonb)) as claim_n,
        jsonb_array_length(COALESCE(quotes, '[]'::jsonb)) as quote_n,
        how_to IS NOT NULL as has_howto,
        item_list IS NOT NULL as has_itemlist,
        dataset IS NOT NULL as has_dataset;
    `;

    const result = await pool.query(query, [slug, ...values]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: "No row matched slug", slug });
      return;
    }

    res.json({
      ok: true,
      patched_columns: accepted,
      row: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/admin/review-enrichment?slug=<slug>
 * Returns the 12 enrichment fields for a review row verbatim so we can
 * distinguish between (a) sync webhook never writing them, (b) Drizzle
 * reading from a different DB than sync writes to, and (c) the builder
 * chain returning null on valid data.
 */
router.get("/admin/review-enrichment", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  try {
    const slug = typeof req.query.slug === "string" ? req.query.slug : "";
    if (!slug) {
      res.status(400).json({ error: "slug query parameter is required" });
      return;
    }
    const client = await pool.connect();
    try {
      const row = await client.query(
        `SELECT
           slug, updated_at,
           author_persona_id, alternative_headline, target_keyword,
           about_slugs, mention_slugs, speakable_selectors, citations,
           dataset, item_list, how_to, quotes, claims,
           jsonb_array_length(COALESCE(about_slugs, '[]'::jsonb)) AS about_n,
           jsonb_array_length(COALESCE(mention_slugs, '[]'::jsonb)) AS mention_n,
           jsonb_array_length(COALESCE(speakable_selectors, '[]'::jsonb)) AS speakable_n,
           jsonb_array_length(COALESCE(citations, '[]'::jsonb)) AS citations_n,
           jsonb_array_length(COALESCE(quotes, '[]'::jsonb)) AS quotes_n,
           jsonb_array_length(COALESCE(claims, '[]'::jsonb)) AS claims_n,
           how_to IS NOT NULL AS has_how_to,
           dataset IS NOT NULL AS has_dataset,
           item_list IS NOT NULL AS has_item_list
         FROM reviews
         WHERE slug = $1
         LIMIT 1`,
        [slug],
      );
      if (row.rowCount === 0) {
        res.status(404).json({ error: "Review not found", slug });
        return;
      }
      const dbInfo = await client.query(
        "SELECT current_database() AS db, inet_server_addr() AS host, now() AS now_ts",
      );
      res.json({
        ok: true,
        connection: dbInfo.rows[0],
        row: row.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
export default router;
