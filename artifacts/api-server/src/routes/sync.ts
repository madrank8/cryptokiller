import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { submitToIndexNow } from "../lib/indexnow";
import { createHash } from "crypto";

const router: IRouter = Router();
const sha256Hex = (input: string) => createHash("sha256").update(input, "utf8").digest("hex");

/** Must match Vercel `lib/sync-shape.js` — sender and receiver hash the same normalized UTF-8 string. */
const normalizeFullArticleForIntegrity = (raw: string): string => {
  let s = raw.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\u0000/g, "");
  try {
    s = s.normalize("NFC");
  } catch {
    /* ignore */
  }
  return s;
};

router.post("/sync/review", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  const expected = process.env.SYNC_SECRET;
  if (!expected || !auth || auth !== `Bearer ${expected}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { review, brand } = req.body;
  if (!review || !brand) {
    res.status(400).json({ error: "Missing review or brand in request body" });
    return;
  }

  const MIN_FULL_ARTICLE_WORDS = 700;
  const fullArticleIncoming = typeof review.full_article === "string" ? review.full_article : "";
  const fullArticleNormalized = normalizeFullArticleForIntegrity(fullArticleIncoming);
  const incomingFullArticleLength = fullArticleNormalized.length;
  const incomingFullArticleWords = fullArticleNormalized
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  const expectedFromBody = Number(req.body?.expected_full_article_length);
  const expectedFromReview = Number(review?.full_article_length);
  const expectedFullArticleLength = Number.isFinite(expectedFromBody)
    ? expectedFromBody
    : Number.isFinite(expectedFromReview)
    ? expectedFromReview
    : null;
  const expectedHashFromBody =
    typeof req.body?.expected_full_article_hash === "string" ? req.body.expected_full_article_hash.trim() : "";
  const expectedHashFromReview =
    typeof review?.full_article_hash === "string" ? review.full_article_hash.trim() : "";
  const expectedFullArticleHash = expectedHashFromBody || expectedHashFromReview || null;
  const incomingFullArticleHash = sha256Hex(fullArticleNormalized);

  if ((review.status ?? "published") === "published" && incomingFullArticleWords < MIN_FULL_ARTICLE_WORDS) {
    res.status(422).json({
      error: "Refusing published sync without full_article content",
      detail: `Incoming full_article too thin (words=${incomingFullArticleWords}, min=${MIN_FULL_ARTICLE_WORDS})`,
      incoming_full_article_length: incomingFullArticleLength,
      expected_full_article_length: expectedFullArticleLength,
    });
    return;
  }

  if (expectedFullArticleLength !== null && incomingFullArticleLength !== expectedFullArticleLength) {
    res.status(422).json({
      error: "full_article length mismatch before insert",
      incoming_full_article_length: incomingFullArticleLength,
      expected_full_article_length: expectedFullArticleLength,
    });
    return;
  }

  if (expectedFullArticleHash !== null && incomingFullArticleHash !== expectedFullArticleHash) {
    res.status(422).json({
      error: "full_article hash mismatch before insert",
      incoming_full_article_hash: incomingFullArticleHash,
      expected_full_article_hash: expectedFullArticleHash,
    });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const platformResult = await client.query(
      `INSERT INTO platforms (name, slug, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
       RETURNING id`,
      [brand.name, brand.slug]
    );
    const platformId = platformResult.rows[0].id;

    const reviewResult = await client.query(
      `INSERT INTO reviews (
        platform_id, slug, status, threat_score, verdict, summary,
        hero_description, warning_callout, investigation_date,
        methodology_text, disclaimer_text, meta_description,
        word_count, reading_minutes, author,
        hero_image_url, hero_image_alt, content_images, visual_meta,
        protection_steps, sources, not_for_you, expertise_depth, full_article,
        threat_tier, threat_label, threat_badge, frame_as_scam,
        author_persona_id, alternative_headline, target_keyword,
        about_slugs, mention_slugs, speakable_selectors, citations,
        dataset, item_reviewed, item_list, how_to, quotes, claims,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,
        $10,$11,$12,
        $13,$14,$15,
        $16,$17,$18,$19,
        $20,$21,$22,$23,$24,
        $25,$26,$27,$28,
        $29,$30,$31,
        $32,$33,$34,$35,
        $36,$37,$38,$39,$40,$41,
        NOW(),NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        platform_id = EXCLUDED.platform_id,
        status = EXCLUDED.status,
        threat_score = EXCLUDED.threat_score,
        verdict = EXCLUDED.verdict,
        summary = EXCLUDED.summary,
        hero_description = EXCLUDED.hero_description,
        warning_callout = EXCLUDED.warning_callout,
        investigation_date = EXCLUDED.investigation_date,
        methodology_text = EXCLUDED.methodology_text,
        disclaimer_text = EXCLUDED.disclaimer_text,
        meta_description = EXCLUDED.meta_description,
        word_count = EXCLUDED.word_count,
        reading_minutes = EXCLUDED.reading_minutes,
        author = EXCLUDED.author,
        hero_image_url = EXCLUDED.hero_image_url,
        hero_image_alt = EXCLUDED.hero_image_alt,
        content_images = EXCLUDED.content_images,
        visual_meta = EXCLUDED.visual_meta,
        protection_steps = EXCLUDED.protection_steps,
        sources = EXCLUDED.sources,
        not_for_you = EXCLUDED.not_for_you,
        expertise_depth = EXCLUDED.expertise_depth,
        full_article = EXCLUDED.full_article,
        threat_tier = EXCLUDED.threat_tier,
        threat_label = EXCLUDED.threat_label,
        threat_badge = EXCLUDED.threat_badge,
        frame_as_scam = EXCLUDED.frame_as_scam,
        author_persona_id = EXCLUDED.author_persona_id,
        alternative_headline = EXCLUDED.alternative_headline,
        target_keyword = EXCLUDED.target_keyword,
        about_slugs = EXCLUDED.about_slugs,
        mention_slugs = EXCLUDED.mention_slugs,
        speakable_selectors = EXCLUDED.speakable_selectors,
        citations = EXCLUDED.citations,
        dataset = EXCLUDED.dataset,
        item_reviewed = EXCLUDED.item_reviewed,
        item_list = EXCLUDED.item_list,
        how_to = EXCLUDED.how_to,
        quotes = EXCLUDED.quotes,
        claims = EXCLUDED.claims,
        updated_at = NOW()
      RETURNING id`,
      [
        platformId,
        review.slug,
        review.status ?? "published",
        review.threat_score ?? 0,
        review.verdict ?? "",
        review.summary ?? "",
        review.hero_description ?? "",
        review.warning_callout ?? "",
        review.investigation_date ?? new Date().toISOString(),
        review.methodology_text ?? "",
        review.disclaimer_text ?? "",
        review.meta_description ?? "",
        review.word_count ?? 0,
        review.reading_minutes ?? 0,
        review.author ?? "Crypto Killer Research Team",
        // Rich-content columns (migration 0002_review_rich_content). Fall
        // back to safe empty defaults if the webhook caller hasn't been
        // updated yet — this keeps the endpoint backward-compatible with
        // the old Vercel shaper while the new one is rolling out.
        review.hero_image_url ?? null,
        review.hero_image_alt ?? null,
        JSON.stringify(Array.isArray(review.content_images) ? review.content_images : []),
        JSON.stringify(Array.isArray(review.visual_meta) ? review.visual_meta : []),
        review.protection_steps ?? "",
        JSON.stringify(Array.isArray(review.sources) ? review.sources : []),
        review.not_for_you ?? "",
        review.expertise_depth ?? "",
        fullArticleNormalized,
        // Tier metadata (migration 0003). Populated by Vercel sync-shape's
        // classifyThreat() output. frame_as_scam defaults to false, so the
        // prerender picks tier-appropriate hedged language when the caller
        // doesn't supply tier metadata at all.
        review.threat_tier ?? null,
        review.threat_label ?? null,
        review.threat_badge ?? null,
        review.frame_as_scam ?? false,
        // Schema enrichment (migration 0003). Each jsonb field stringified
        // for pg binding — mirrors the pattern established for the rich
        // content columns above. Array fields default to []; scalar object
        // fields (dataset/item_list/how_to) default to null so the absence
        // of the node is distinguishable from an empty node.
        review.author_persona_id ?? null,
        review.alternative_headline ?? null,
        review.target_keyword ?? null,
        JSON.stringify(Array.isArray(review.about_slugs) ? review.about_slugs : []),
        JSON.stringify(Array.isArray(review.mention_slugs) ? review.mention_slugs : []),
        JSON.stringify(Array.isArray(review.speakable_selectors) ? review.speakable_selectors : []),
        JSON.stringify(Array.isArray(review.citations) ? review.citations : (Array.isArray(review.typed_citations) ? review.typed_citations : [])),
        review.dataset ? JSON.stringify(review.dataset) : null,
        // item_reviewed (Task 7C/Replit migration 0004). Typed entity
        // node the review is ABOUT. Null until the writer re-runs post-
        // Vercel-Task-7C; safely degrades to prerender's synthesised
        // Service fallback in that window.
        review.item_reviewed ? JSON.stringify(review.item_reviewed) : null,
        review.item_list ? JSON.stringify(review.item_list) : null,
        review.how_to ? JSON.stringify(review.how_to) : null,
        JSON.stringify(Array.isArray(review.quotes) ? review.quotes : []),
        JSON.stringify(Array.isArray(review.claims) ? review.claims : []),
      ]
    );
    const reviewId = reviewResult.rows[0].id;

    await client.query("DELETE FROM review_stats WHERE review_id = $1", [reviewId]);
    if (review.stats) {
      const s = review.stats;
      await client.query(
        `INSERT INTO review_stats (
          review_id, ad_creatives, countries_targeted, days_active,
          celebrities_abused, weekly_velocity, first_detected, last_active,
          celebrity_names, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
        [
          reviewId,
          s.ad_creatives ?? 0,
          s.countries_targeted ?? 0,
          s.days_active ?? 0,
          s.celebrities_abused ?? 0,
          s.weekly_velocity ?? 0,
          s.first_detected ?? "",
          s.last_active ?? "",
          s.celebrity_names ?? [],
        ]
      );
    }

    await client.query("DELETE FROM red_flags WHERE review_id = $1", [reviewId]);
    if (Array.isArray(review.red_flags)) {
      for (let i = 0; i < review.red_flags.length; i++) {
        const rf = review.red_flags[i];
        await client.query(
          `INSERT INTO red_flags (review_id, emoji, title, description, order_index, created_at)
           VALUES ($1,$2,$3,$4,$5,NOW())`,
          [reviewId, rf.emoji ?? "🚩", rf.title, rf.description, rf.order_index ?? i]
        );
      }
    }

    await client.query("DELETE FROM faq_items WHERE review_id = $1", [reviewId]);
    if (Array.isArray(review.faq_items)) {
      for (let i = 0; i < review.faq_items.length; i++) {
        const faq = review.faq_items[i];
        await client.query(
          `INSERT INTO faq_items (review_id, question, answer, order_index, created_at)
           VALUES ($1,$2,$3,$4,NOW())`,
          [reviewId, faq.question, faq.answer, faq.order_index ?? i]
        );
      }
    }

    await client.query("DELETE FROM funnel_stages WHERE review_id = $1", [reviewId]);
    if (Array.isArray(review.funnel_stages)) {
      for (const fs of review.funnel_stages) {
        await client.query(
          `INSERT INTO funnel_stages (
            review_id, stage_number, title, description,
            stat_value, stat_label, bullets, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
          [
            reviewId,
            fs.stage_number,
            fs.title,
            fs.description ?? "",
            fs.stat_value ?? "",
            fs.stat_label ?? "",
            fs.bullets ?? [],
          ]
        );
      }
    }

    await client.query("DELETE FROM geo_targets WHERE review_id = $1", [reviewId]);
    if (Array.isArray(review.geo_targets)) {
      for (let i = 0; i < review.geo_targets.length; i++) {
        const gt = review.geo_targets[i];
        await client.query(
          `INSERT INTO geo_targets (review_id, region, country_codes, order_index, created_at)
           VALUES ($1,$2,$3,$4,NOW())`,
          [reviewId, gt.region, gt.country_codes, gt.order_index ?? i]
        );
      }
    }

    await client.query("DELETE FROM key_findings WHERE review_id = $1", [reviewId]);
    if (Array.isArray(review.key_findings)) {
      for (let i = 0; i < review.key_findings.length; i++) {
        const kf = review.key_findings[i];
        await client.query(
          `INSERT INTO key_findings (review_id, content, order_index, created_at)
           VALUES ($1,$2,$3,NOW())`,
          [reviewId, kf.content, kf.order_index ?? i]
        );
      }
    }

    const storedArticleResult = await client.query(
      `SELECT COALESCE(full_article, '') AS full_article FROM reviews WHERE id = $1`,
      [reviewId]
    );
    const storedFullArticleRaw = String(storedArticleResult.rows[0]?.full_article ?? "");
    const storedFullArticle = normalizeFullArticleForIntegrity(storedFullArticleRaw);
    const storedFullArticleLength = storedFullArticle.length;
    const storedFullArticleHash = sha256Hex(storedFullArticle);
    const fullArticleLengthMatches =
      expectedFullArticleLength === null
        ? storedFullArticleLength === incomingFullArticleLength
        : storedFullArticleLength === expectedFullArticleLength;
    const fullArticleHashMatches =
      expectedFullArticleHash === null
        ? storedFullArticleHash === incomingFullArticleHash
        : storedFullArticleHash === expectedFullArticleHash;

    if (!fullArticleLengthMatches || !fullArticleHashMatches) {
      await client.query("ROLLBACK");
      res.status(422).json({
        error: "full_article integrity failed after insert",
        incoming_full_article_length: incomingFullArticleLength,
        expected_full_article_length: expectedFullArticleLength,
        full_article_length: storedFullArticleLength,
        full_article_length_matches: fullArticleLengthMatches,
        incoming_full_article_hash: incomingFullArticleHash,
        expected_full_article_hash: expectedFullArticleHash,
        full_article_hash: storedFullArticleHash,
        full_article_hash_matches: fullArticleHashMatches,
      });
      return;
    }

    await client.query("COMMIT");

    submitToIndexNow([`https://cryptokiller.org/review/${review.slug}`]).catch(() => {});

    res.json({
      ok: true,
      reviewId,
      review_id: reviewId,
      platformId,
      platform_id: platformId,
      slug: review.slug,
      incoming_full_article_length: incomingFullArticleLength,
      expected_full_article_length: expectedFullArticleLength,
      full_article_length: storedFullArticleLength,
      full_article_length_matches: fullArticleLengthMatches,
      incoming_full_article_hash: incomingFullArticleHash,
      expected_full_article_hash: expectedFullArticleHash,
      full_article_hash: storedFullArticleHash,
      full_article_hash_matches: fullArticleHashMatches,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Sync failed:", err);
    res.status(500).json({ error: "Sync failed", detail: String(err) });
  } finally {
    client.release();
  }
});

export default router;
