import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { submitToIndexNow } from "../lib/indexnow";

const router: IRouter = Router();

function handler(req: import("express").Request, res: import("express").Response): Promise<void> {
  return handleBlogSync(req, res);
}

router.post("/sync/blog", handler);
router.post("/sync/content", handler);
router.post("/sync/post", handler);

async function handleBlogSync(req: import("express").Request, res: import("express").Response): Promise<void> {
  const auth = req.headers.authorization;
  const expected = process.env.SYNC_SECRET;
  if (!expected || !auth || auth !== `Bearer ${expected}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { content, topic, destination, url } = req.body;
  if (!content || !content.slug) {
    res.status(400).json({ error: "Missing content or content.slug in request body" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const authorPersonaId = content.ai_audit?.writer_persona?.id ?? content.author_persona_id ?? null;

    const result = await client.query(
      `INSERT INTO blog_posts (
        external_id, topic_id, content_type, title, headline, slug,
        meta_description, summary, full_article, sections, faq,
        internal_links, sources, word_count, status,
        topic_title, target_keyword, priority_score, search_volume,
        keyword_difficulty, published_at, destination, url,
        author_persona_id,
        hero_image_url, hero_image_alt, hero_image_credit, visual_meta,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,NOW(),NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        external_id = EXCLUDED.external_id,
        topic_id = EXCLUDED.topic_id,
        content_type = EXCLUDED.content_type,
        title = EXCLUDED.title,
        headline = EXCLUDED.headline,
        meta_description = EXCLUDED.meta_description,
        summary = EXCLUDED.summary,
        full_article = EXCLUDED.full_article,
        sections = EXCLUDED.sections,
        faq = EXCLUDED.faq,
        internal_links = EXCLUDED.internal_links,
        sources = EXCLUDED.sources,
        word_count = EXCLUDED.word_count,
        status = EXCLUDED.status,
        topic_title = EXCLUDED.topic_title,
        target_keyword = EXCLUDED.target_keyword,
        priority_score = EXCLUDED.priority_score,
        search_volume = EXCLUDED.search_volume,
        keyword_difficulty = EXCLUDED.keyword_difficulty,
        published_at = EXCLUDED.published_at,
        destination = EXCLUDED.destination,
        url = EXCLUDED.url,
        author_persona_id = EXCLUDED.author_persona_id,
        hero_image_url = EXCLUDED.hero_image_url,
        hero_image_alt = EXCLUDED.hero_image_alt,
        hero_image_credit = EXCLUDED.hero_image_credit,
        visual_meta = EXCLUDED.visual_meta,
        updated_at = NOW()
      RETURNING id, (xmax = 0) AS inserted`,
      [
        content.id ?? "",
        content.topic_id ?? topic?.id ?? "",
        content.content_type ?? topic?.content_type ?? "",
        content.title ?? "",
        content.headline ?? "",
        content.slug,
        content.meta_description ?? "",
        content.summary ?? "",
        content.full_article ?? "",
        JSON.stringify(content.sections ?? []),
        JSON.stringify(content.faq ?? []),
        JSON.stringify(content.internal_links ?? []),
        JSON.stringify(content.sources ?? []),
        content.word_count ?? 0,
        content.status ?? "draft",
        topic?.title ?? "",
        topic?.target_keyword ?? "",
        topic?.priority_score ?? 0,
        topic?.search_volume ?? 0,
        topic?.keyword_difficulty ?? 0,
        content.published_at ?? (content.status === "published" ? new Date().toISOString() : null),
        destination ?? "blog",
        url ?? `/blog/${content.slug}`,
        authorPersonaId,
        content.hero_image_url ?? null,
        content.hero_image_alt ?? null,
        content.hero_image_credit ?? null,
        JSON.stringify(content.visual_meta ?? []),
      ]
    );

    await client.query("COMMIT");

    const row = result.rows[0];
    const blogUrl = `https://cryptokiller.org/blog/${content.slug}`;

    submitToIndexNow([blogUrl]).catch(() => {});

    res.json({
      success: true,
      slug: content.slug,
      url: blogUrl,
      post_id: row.id,
      action: row.inserted ? "created" : "updated",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Blog sync failed:", err);
    res.status(500).json({ error: "Sync failed", detail: String(err) });
  } finally {
    client.release();
  }
}

export default router;
