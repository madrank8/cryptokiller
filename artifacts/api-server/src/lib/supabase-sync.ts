import { eq, inArray } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";
import {
  platformsTable,
  reviewsTable,
  reviewStatsTable,
  redFlagsTable,
  funnelStagesTable,
  faqItemsTable,
  keyFindingsTable,
  geoTargetsTable,
  reviewTranslationsTable,
} from "@workspace/db";
import { supabase } from "./supabase";
import { logger } from "./logger";

interface SupaBrand {
  id: string;
  slug: string;
  name: string;
  total_creatives: number;
  total_geos: number;
  total_celebrities: number;
  geo_list: string[];
  celebrity_list: string[];
  first_seen_at: string;
  last_seen_at: string;
  lifespan_days: number;
  velocity_7d: number;
  velocity_trend: string;
  scam_score: number;
  status: string;
  review_status: string;
}

interface SupaReview {
  id: string;
  brand_id: string;
  slug: string;
  title: string;
  headline: string;
  summary: string;
  red_flags: { flag: string; detail: string }[];
  how_it_works: string;
  verdict: string;
  scam_score: number;
  status: string;
  faq: { question: string; answer: string }[];
  word_count: number;
  author_name: string;
  methodology: string;
  disclaimer: string;
  key_takeaways: string[];
  not_for_you: string;
  protection_steps: string;
  review_date: string;
  full_article: string;
  meta_description: string;
  experience_signals: string[];
}

export interface SyncResult {
  syncedBrands: number;
  syncedReviews: number;
  syncedTranslations: number;
  durationMs: number;
}

const ALLOWED_TRANSLATION_LOCALES = new Set(["it", "es", "de", "fr", "pt-BR"]);

function parseHowItWorks(text: string): { stageNumber: number; title: string; bullets: string[]; statValue: string; statLabel: string }[] {
  if (!text) return [];

  const stages: { stageNumber: number; title: string; bullets: string[]; statValue: string; statLabel: string }[] = [];

  const stagePattern = /STAGE\s+(\d+)\s*(?:[—–\-]\s*|\()/gi;
  const markers: { index: number; num: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = stagePattern.exec(text)) !== null) {
    markers.push({ index: m.index, num: parseInt(m[1], 10) });
  }

  if (markers.length > 0) {
    for (let i = 0; i < markers.length; i++) {
      const start = markers[i].index;
      const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
      const block = text.slice(start, end);
      const headerMatch = block.match(/^STAGE\s+\d+\s*(?:[—–\-]\s*|\()([^:)]+)[):]\s*/i);
      let title: string;
      let bodyText: string;
      if (headerMatch) {
        title = headerMatch[1].trim();
        bodyText = block.slice(headerMatch[0].length).trim();
      } else {
        const fallback = block.replace(/^STAGE\s+\d+\s*(?:[—–\-]\s*|\()/i, "");
        const sentences = fallback.split(/\.\s+/).filter(Boolean);
        title = sentences[0]?.replace(/\.$/, "").trim() ?? `Stage ${markers[i].num}`;
        bodyText = sentences.slice(1).join(". ").trim();
      }
      const bullets = bodyText
        .split(/\.\s+/)
        .map(s => s.replace(/\.$/, "").trim())
        .filter(b => b.length > 10 && !b.match(/^STAGE\s+\d+/i));
      stages.push({
        stageNumber: markers[i].num,
        title,
        bullets: bullets.slice(0, 6),
        statValue: "",
        statLabel: "",
      });
    }
    return stages;
  }

  const stageBlocks = text.split(/Stage \d+:\s*/i).filter(Boolean);
  stageBlocks.forEach((block, idx) => {
    const lines = block.split(/\.\s+/).filter(Boolean);
    const title = lines[0]?.replace(/\.$/, "").trim() ?? `Stage ${idx + 1}`;
    const bullets = lines.slice(1).map(l => l.replace(/\.$/, "").trim()).filter(b => b.length > 10);
    stages.push({
      stageNumber: idx + 1,
      title,
      bullets: bullets.slice(0, 6),
      statValue: "",
      statLabel: "",
    });
  });

  return stages;
}

function groupGeoList(geoList: string[]): { region: string; countryCodes: string }[] {
  const europeCountries = ["AT","BE","BG","CH","CY","CZ","DE","DK","EE","ES","FI","FR","GB","GR","HR","HU","IE","IS","IT","LT","LU","LV","ME","MT","NL","NO","PL","PT","RO","RS","SE","SI","SK","AL"];
  const americasCountries = ["AR","BO","BR","CA","CL","CO","CR","CU","DO","EC","GT","HN","MX","NI","PA","PE","PR","PY","SV","US","UY","VE"];
  const asiaCountries = ["AE","AM","AZ","BD","BH","CN","GE","HK","ID","IL","IN","IQ","IR","JP","JO","KG","KR","KW","KZ","LB","MD","MN","MY","OM","PH","PK","QA","SA","SG","TH","TJ","TM","TR","TW","UZ","VN"];
  const africaCountries = ["BF","BJ","CI","CM","DZ","EG","ET","GH","KE","LY","MA","MG","ML","MU","MW","MZ","NA","NG","RW","SN","TN","TZ","UG","ZA","ZW"];
  const oceaniaCountries = ["AU","FJ","NZ","PG"];

  const groups: { region: string; codes: string[] }[] = [
    { region: "Europe", codes: [] },
    { region: "Americas", codes: [] },
    { region: "Asia & Middle East", codes: [] },
    { region: "Africa", codes: [] },
    { region: "Oceania", codes: [] },
    { region: "Other", codes: [] },
  ];

  for (const code of geoList) {
    const upper = code.toUpperCase();
    if (europeCountries.includes(upper)) groups[0].codes.push(upper);
    else if (americasCountries.includes(upper)) groups[1].codes.push(upper);
    else if (asiaCountries.includes(upper)) groups[2].codes.push(upper);
    else if (africaCountries.includes(upper)) groups[3].codes.push(upper);
    else if (oceaniaCountries.includes(upper)) groups[4].codes.push(upper);
    else groups[5].codes.push(upper);
  }

  return groups
    .filter(g => g.codes.length > 0)
    .map(g => ({ region: g.region, countryCodes: g.codes.join(", ") }));
}

export async function runSupabaseSync(): Promise<SyncResult> {
  const log = logger.child({ module: "supabase-sync" });
  const start = Date.now();
  let syncedBrands = 0;
  let syncedReviews = 0;
  let syncedTranslations = 0;

  if (!supabase) {
    log.warn("Supabase not configured — skipping sync");
    return { syncedBrands: 0, syncedReviews: 0, syncedTranslations: 0, durationMs: 0 };
  }

  const { data: brands, error: brandsErr } = await supabase
    .from("scam_brands")
    .select("*")
    .order("scam_score", { ascending: false });

  if (brandsErr) throw brandsErr;
  if (!brands || brands.length === 0) {
    log.info("No brands found in Supabase");
    return { syncedBrands: 0, syncedReviews: 0, syncedTranslations: 0, durationMs: Date.now() - start };
  }

  log.info(`Fetched ${brands.length} brands from Supabase`);

  for (const brand of brands as SupaBrand[]) {
    const [platform] = await db
      .insert(platformsTable)
      .values({ name: brand.name, slug: brand.slug })
      .onConflictDoUpdate({ target: platformsTable.slug, set: { name: brand.name } })
      .returning();

    const firstDetected = brand.first_seen_at
      ? new Date(brand.first_seen_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : "";
    const lastActive = brand.last_seen_at
      ? new Date(brand.last_seen_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : "";

    const reviewStatus = brand.review_status === "published" ? "published" : "draft";

    const [review] = await db
      .insert(reviewsTable)
      .values({
        platformId: platform.id,
        slug: brand.slug,
        status: reviewStatus,
        threatScore: brand.scam_score,
        verdict: "",
        summary: "",
        heroDescription: "",
        investigationDate: brand.first_seen_at ? new Date(brand.first_seen_at) : new Date(),
        wordCount: 0,
        readingMinutes: 0,
        author: "Crypto Killer Research Team",
      })
      .onConflictDoUpdate({
        target: reviewsTable.slug,
        set: {
          threatScore: brand.scam_score,
          status: reviewStatus,
        },
      })
      .returning();

    const celebrityNames = Array.isArray(brand.celebrity_list) ? brand.celebrity_list : [];

    await db
      .insert(reviewStatsTable)
      .values({
        reviewId: review.id,
        adCreatives: brand.total_creatives,
        countriesTargeted: brand.total_geos,
        daysActive: brand.lifespan_days,
        celebritiesAbused: brand.total_celebrities,
        weeklyVelocity: brand.velocity_7d,
        firstDetected,
        lastActive,
        celebrityNames,
      })
      .onConflictDoUpdate({
        target: reviewStatsTable.reviewId,
        set: {
          adCreatives: brand.total_creatives,
          countriesTargeted: brand.total_geos,
          daysActive: brand.lifespan_days,
          celebritiesAbused: brand.total_celebrities,
          weeklyVelocity: brand.velocity_7d,
          firstDetected,
          lastActive,
          celebrityNames,
        },
      });

    syncedBrands++;
  }

  log.info(`Synced ${syncedBrands} brands`);

  const { data: reviews, error: reviewsErr } = await supabase
    .from("reviews")
    .select("*")
    .eq("status", "published");

  if (reviewsErr) throw reviewsErr;

  if (reviews && reviews.length > 0) {
    log.info(`Fetched ${reviews.length} published reviews from Supabase`);

    for (const supaReview of reviews as SupaReview[]) {
      const [existingReview] = await db
        .select()
        .from(reviewsTable)
        .where(eq(reviewsTable.slug, supaReview.slug));

      if (!existingReview) {
        log.warn(`No matching review row for slug: ${supaReview.slug}, skipping`);
        continue;
      }

      const keyTakeaways = (supaReview.key_takeaways ?? []).join("\n");
      const reviewDate = supaReview.review_date ? new Date(supaReview.review_date) : new Date();

      await db
        .update(reviewsTable)
        .set({
          status: "published",
          threatScore: supaReview.scam_score,
          verdict: supaReview.verdict ?? "",
          summary: keyTakeaways,
          heroDescription: supaReview.summary ?? "",
          warningCallout: supaReview.not_for_you ?? "",
          investigationDate: reviewDate,
          methodologyText: supaReview.methodology ?? "",
          disclaimerText: supaReview.disclaimer ?? "",
          metaDescription: supaReview.meta_description ?? "",
          wordCount: supaReview.word_count ?? 0,
          readingMinutes: Math.ceil((supaReview.word_count ?? 0) / 230),
          author: supaReview.author_name ?? "Crypto Killer Research Team",
        })
        .where(eq(reviewsTable.id, existingReview.id));

      await db.delete(redFlagsTable).where(eq(redFlagsTable.reviewId, existingReview.id));
      await db.delete(funnelStagesTable).where(eq(funnelStagesTable.reviewId, existingReview.id));
      await db.delete(faqItemsTable).where(eq(faqItemsTable.reviewId, existingReview.id));
      await db.delete(keyFindingsTable).where(eq(keyFindingsTable.reviewId, existingReview.id));
      await db.delete(geoTargetsTable).where(eq(geoTargetsTable.reviewId, existingReview.id));

      const redFlags = Array.isArray(supaReview.red_flags) ? supaReview.red_flags : [];
      if (redFlags.length > 0) {
        await db.insert(redFlagsTable).values(
          redFlags.map((rf: any, i: number) => {
            const flagStr = typeof rf === "string" ? rf : rf.flag ?? "";
            const detail = typeof rf === "string" ? "" : rf.detail ?? "";
            const parts = flagStr.split(" ");
            const emoji = parts[0] ?? "🚩";
            const title = parts.slice(1).join(" ") || flagStr;
            return {
              reviewId: existingReview.id,
              emoji,
              title,
              description: detail,
              orderIndex: i,
            };
          })
        );
      }

      const stages = parseHowItWorks(supaReview.how_it_works ?? "");
      if (stages.length > 0) {
        await db.insert(funnelStagesTable).values(
          stages.map(s => ({
            reviewId: existingReview.id,
            stageNumber: s.stageNumber,
            title: s.title,
            statValue: s.statValue,
            statLabel: s.statLabel,
            bullets: s.bullets,
          }))
        );
      }

      const faqs = Array.isArray(supaReview.faq) ? supaReview.faq : [];
      if (faqs.length > 0) {
        await db.insert(faqItemsTable).values(
          faqs.map((f: any, i: number) => ({
            reviewId: existingReview.id,
            question: f.question ?? "",
            answer: f.answer ?? "",
            orderIndex: i,
          }))
        );
      }

      const findings = Array.isArray(supaReview.experience_signals) ? supaReview.experience_signals : [];
      if (findings.length > 0) {
        await db.insert(keyFindingsTable).values(
          findings.map((content: any, i: number) => ({
            reviewId: existingReview.id,
            content: typeof content === "string" ? content : JSON.stringify(content),
            orderIndex: i,
          }))
        );
      }

      const brandData = (brands as SupaBrand[]).find(b => b.id === supaReview.brand_id);
      if (brandData && Array.isArray(brandData.geo_list) && brandData.geo_list.length > 0) {
        const geos = groupGeoList(brandData.geo_list);
        if (geos.length > 0) {
          await db.insert(geoTargetsTable).values(
            geos.map((g, i) => ({
              reviewId: existingReview.id,
              region: g.region,
              countryCodes: g.countryCodes,
              orderIndex: i,
            }))
          );
        }
      }

      syncedReviews++;
    }
  }

  try {
    const { data: contentRows, error: contentErr } = await supabase
      .from("content")
      .select("*")
      .eq("status", "published");

    if (contentErr) {
      log.warn({ error: contentErr }, "Could not fetch content table for blog sync");
    } else if (contentRows && contentRows.length > 0) {
      for (const row of contentRows) {
        if (!row.slug) continue;
        const personaId = row.ai_audit?.writer_persona?.id ?? null;

        await db
          .insert(blogPostsTable)
          .values({
            externalId: row.id ?? "",
            topicId: row.topic_id ?? "",
            contentType: row.content_type ?? "",
            title: row.title ?? "",
            headline: row.headline ?? "",
            slug: row.slug,
            metaDescription: row.meta_description ?? "",
            summary: row.summary ?? "",
            fullArticle: row.full_article ?? "",
            sections: row.sections ?? [],
            faq: row.faq ?? [],
            internalLinks: row.internal_links ?? [],
            sources: row.sources ?? [],
            wordCount: row.word_count ?? 0,
            status: row.status ?? "draft",
            topicTitle: row.topic_title ?? "",
            targetKeyword: row.target_keyword ?? "",
            priorityScore: row.priority_score ?? 0,
            searchVolume: row.search_volume ?? 0,
            keywordDifficulty: row.keyword_difficulty ?? 0,
            publishedAt: row.published_at ? new Date(row.published_at) : new Date(),
            destination: row.destination ?? "blog",
            url: row.url ?? `/blog/${row.slug}`,
            authorPersonaId: personaId,
            heroImageUrl: row.hero_image_url ?? null,
            heroImageAlt: row.hero_image_alt ?? null,
            heroImageCredit: row.hero_image_credit ?? null,
            visualMeta: row.visual_meta ?? [],
          })
          .onConflictDoUpdate({
            target: blogPostsTable.slug,
            set: {
              externalId: row.id ?? "",
              topicId: row.topic_id ?? "",
              contentType: row.content_type ?? "",
              title: row.title ?? "",
              headline: row.headline ?? "",
              metaDescription: row.meta_description ?? "",
              summary: row.summary ?? "",
              fullArticle: row.full_article ?? "",
              sections: row.sections ?? [],
              faq: row.faq ?? [],
              internalLinks: row.internal_links ?? [],
              sources: row.sources ?? [],
              wordCount: row.word_count ?? 0,
              status: row.status ?? "draft",
              publishedAt: row.published_at ? new Date(row.published_at) : new Date(),
              authorPersonaId: personaId,
              heroImageUrl: row.hero_image_url ?? null,
              heroImageAlt: row.hero_image_alt ?? null,
              heroImageCredit: row.hero_image_credit ?? null,
              visualMeta: row.visual_meta ?? [],
            },
          });
      }
      log.info(`Synced ${contentRows.length} blog posts from content table`);
    }
  } catch (err) {
    log.warn({ error: err }, "content blog sync failed (non-fatal)");
  }

  // ── review_translations sync (Phase 3 — multilingual) ──
  // Pull all published translations from Supabase and mirror into Replit
  // Postgres. Map Supabase translation.review_id → Supabase reviews.slug →
  // Replit reviews.id (same slug = same review on both sides).
  // Delete-then-insert per (review_id) — translations that disappear
  // upstream disappear here too.
  try {
    // Pull ALL translation rows (any status) so we can correctly prune
    // local rows whose upstream was unpublished or deleted. The published
    // subset is what we actually insert below.
    const { data: supaTranslations, error: tErr } = await supabase
      .from("review_translations")
      .select("*");

    if (tErr) {
      log.warn({ error: tErr }, "review_translations fetch failed (non-fatal)");
    } else if (supaTranslations) {
      const supaReviewIds = [...new Set(supaTranslations.map((t: any) => t.review_id).filter(Boolean))];
      const { data: supaRevs, error: rErr } = supaReviewIds.length
        ? await supabase.from("reviews").select("id,slug").in("id", supaReviewIds)
        : { data: [], error: null };

      if (rErr) {
        log.warn({ error: rErr }, "source reviews fetch for translations failed (non-fatal)");
      } else {
        const supaIdToSlug = new Map<string, string>();
        for (const r of supaRevs ?? []) supaIdToSlug.set(r.id, r.slug);

        const slugs = [...new Set([...supaIdToSlug.values()])];
        const replitRows = slugs.length
          ? await db.select({ id: reviewsTable.id, slug: reviewsTable.slug })
              .from(reviewsTable).where(inArray(reviewsTable.slug, slugs))
          : [];
        const slugToReplitId = new Map<string, number>();
        for (const r of replitRows) slugToReplitId.set(r.slug, r.id);

        // Set of all local review IDs whose upstream translations we saw
        // (any status). These are the rows we are authoritative for this
        // run — delete all of them, then re-insert only the published
        // subset. Reviews not in this set are left alone.
        const affectedReplitIds = new Set<number>();
        for (const t of supaTranslations) {
          const sourceSlug = supaIdToSlug.get(t.review_id);
          if (!sourceSlug) continue;
          const replitId = slugToReplitId.get(sourceSlug);
          if (replitId) affectedReplitIds.add(replitId);
        }

        const byReplitId = new Map<number, any[]>();
        for (const t of supaTranslations) {
          if (t.status !== "published") continue;
          const locale = typeof t.locale === "string" ? t.locale.trim() : "";
          const tSlug = typeof t.slug === "string" ? t.slug.trim() : "";
          if (!locale || !tSlug) continue;
          if (!ALLOWED_TRANSLATION_LOCALES.has(locale)) continue;
          const sourceSlug = supaIdToSlug.get(t.review_id);
          if (!sourceSlug) continue;
          const replitId = slugToReplitId.get(sourceSlug);
          if (!replitId) continue;
          const arr = byReplitId.get(replitId) ?? [];
          arr.push(t);
          byReplitId.set(replitId, arr);
        }

        // Prune first across all affected reviews (including those that
        // now have zero published translations), then insert the
        // current published set. Each review's delete+insert runs in a
        // transaction so a mid-insert failure cannot leave a review
        // with all its translations wiped.
        const prunedOnly = new Set<number>();
        for (const replitId of affectedReplitIds) {
          if (!byReplitId.has(replitId)) {
            await db.delete(reviewTranslationsTable).where(eq(reviewTranslationsTable.reviewId, replitId));
            prunedOnly.add(replitId);
          }
        }

        for (const [replitId, rows] of byReplitId.entries()) {
          await db.transaction(async (tx) => {
            await tx.delete(reviewTranslationsTable).where(eq(reviewTranslationsTable.reviewId, replitId));
            for (const t of rows) {
              await tx.insert(reviewTranslationsTable).values({
                reviewId: replitId,
                locale: t.locale,
                slug: t.slug,
                status: t.status ?? "published",
                title: t.title ?? null,
                metaDescription: t.meta_description ?? null,
                headline: t.headline ?? null,
                alternativeHeadline: t.alternative_headline ?? null,
                summary: t.summary ?? null,
                verdict: t.verdict ?? null,
                howItWorks: t.how_it_works ?? null,
                fullArticle: typeof t.full_article === "string" ? t.full_article : null,
                redFlags: t.red_flags ?? null,
                faq: t.faq ?? null,
                keyTakeaways: t.key_takeaways ?? null,
                notForYou: t.not_for_you ?? null,
                protectionSteps: t.protection_steps ?? null,
                methodology: t.methodology ?? null,
                disclaimer: t.disclaimer ?? null,
                expertiseDepth: t.expertise_depth ?? null,
                translationMethod: t.translation_method ?? null,
                translatorName: t.translator_name ?? null,
                translatorCredentials: t.translator_credentials ?? null,
                aiModel: t.ai_model ?? null,
                aiPromptVersion: t.ai_prompt_version ?? null,
                reviewedAt: t.reviewed_at ? new Date(t.reviewed_at) : null,
                wordCount: typeof t.word_count === "number" ? t.word_count : null,
                publishedAt: t.published_at ? new Date(t.published_at) : null,
                sourceReviewUpdatedAt: t.source_review_updated_at ? new Date(t.source_review_updated_at) : null,
              });
              syncedTranslations++;
            }
          });
        }
        log.info(
          { syncedTranslations, prunedReviews: prunedOnly.size, affectedReviews: affectedReplitIds.size },
          "review_translations sync complete",
        );
      }
    }
  } catch (err) {
    log.warn({ error: err }, "review_translations sync failed (non-fatal)");
  }

  const durationMs = Date.now() - start;
  log.info({ syncedBrands, syncedReviews, syncedTranslations, durationMs }, "Supabase sync complete");

  return { syncedBrands, syncedReviews, syncedTranslations, durationMs };
}

const SYNC_INTERVAL_MS = 2 * 60 * 1000;
let syncInterval: ReturnType<typeof setInterval> | null = null;
let startupTimeout: ReturnType<typeof setTimeout> | null = null;
let syncInProgress = false;

async function guardedSync(label: string): Promise<void> {
  const log = logger.child({ module: "sync-scheduler" });

  if (syncInProgress) {
    log.warn(`Skipping ${label} — previous sync still in progress`);
    return;
  }

  syncInProgress = true;
  try {
    log.info(`Running ${label}`);
    const result = await runSupabaseSync();
    log.info(result, `${label} complete`);
  } catch (err) {
    log.error(err, `${label} failed`);
  } finally {
    syncInProgress = false;
  }
}

export async function repairFunnelStages(): Promise<number> {
  const log = logger.child({ module: "funnel-repair" });
  const allStages = await db
    .select({
      id: funnelStagesTable.id,
      reviewId: funnelStagesTable.reviewId,
      stageNumber: funnelStagesTable.stageNumber,
      title: funnelStagesTable.title,
      bullets: funnelStagesTable.bullets,
    })
    .from(funnelStagesTable);

  const byReview = new Map<number, typeof allStages>();
  for (const s of allStages) {
    const arr = byReview.get(s.reviewId) ?? [];
    arr.push(s);
    byReview.set(s.reviewId, arr);
  }

  let repairedCount = 0;

  for (const [reviewId, stages] of byReview.entries()) {
    if (stages.length !== 1) continue;

    const stage = stages[0];
    const fullText = stage.title + ". " + (stage.bullets ?? []).join(". ");

    if (!fullText.match(/STAGE\s+\d+\s*(?:[—–\-(])/i)) continue;

    const parsed = parseHowItWorks(fullText);
    if (parsed.length <= 1) continue;

    await db.delete(funnelStagesTable).where(eq(funnelStagesTable.reviewId, reviewId));
    await db.insert(funnelStagesTable).values(
      parsed.map(s => ({
        reviewId,
        stageNumber: s.stageNumber,
        title: s.title,
        statValue: s.statValue,
        statLabel: s.statLabel,
        bullets: s.bullets,
      }))
    );
    repairedCount++;
  }

  log.info({ repairedCount }, "Funnel stage repair complete");
  return repairedCount;
}

export function startSyncScheduler(): void {
  const log = logger.child({ module: "sync-scheduler" });

  if (syncInterval) {
    log.warn("Sync scheduler already running — skipping duplicate start");
    return;
  }

  startupTimeout = setTimeout(async () => {
    startupTimeout = null;
    try {
      await repairFunnelStages();
    } catch (err) {
      log.error(err, "Funnel stage repair failed");
    }
    guardedSync("initial Supabase sync");
  }, 5_000);

  syncInterval = setInterval(() => {
    guardedSync("scheduled Supabase sync");
  }, SYNC_INTERVAL_MS);

  log.info({ intervalMs: SYNC_INTERVAL_MS }, "Sync scheduler started — will sync every 15 minutes");
}

export function stopSyncScheduler(): void {
  if (startupTimeout) {
    clearTimeout(startupTimeout);
    startupTimeout = null;
  }
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  logger.info("Sync scheduler stopped");
}
