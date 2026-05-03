import { eq, count, sql } from "drizzle-orm";
import { db, platformAggregatesTable, reviewsTable } from "@workspace/db";

// Combined view of platform-level statistics that the article token system
// (`{{platform_stat:KEY}}`) substitutes at render time. Two data origins:
//
//   - Vercel-synced fields (totalBrandsTracked, totalCreativesAnalyzed,
//     totalBrandsWithCelebrityAbuse, avgScamScore, topVelocityTrend, top*)
//     come from the platform_aggregates row keyed `source = 'vercel-sync'`,
//     which is upserted by POST /sync/platform-aggregates from the Vercel
//     side. Vercel has visibility into the full SpyOwl universe (scam_brands,
//     creatives) which Replit does not.
//
//   - totalBrandsReviewed is computed live from Replit's own `reviews` table.
//     It always reflects current state — no caching, no sync lag.
//
// Result: the writer prompt's notion of "platform" (Vercel universe) and the
// renderer's notion of "what we have published" (Replit count) are both
// addressable via tokens, with the right source for each.
export interface PlatformAggregatesShape {
  totalBrandsTracked: number | null;
  totalCreativesAnalyzed: number | null;
  totalBrandsWithCelebrityAbuse: number | null;
  totalBrandsReviewed: number | null;
  avgScamScore: number | null;
  topVelocityTrend: string | null;
  topScamBrandName: string | null;
  topScamBrandScore: number | null;
  vercelSyncedAt: string | null;
  replitComputedAt: string;
  metadata: Record<string, unknown> | null;
}

export async function getPlatformAggregates(): Promise<PlatformAggregatesShape> {
  // Run both queries in parallel — independent reads.
  const [vRowsResult, replitCountResult] = await Promise.all([
    db
      .select()
      .from(platformAggregatesTable)
      .where(eq(platformAggregatesTable.source, "vercel-sync"))
      .limit(1),
    db
      .select({ n: count() })
      .from(reviewsTable)
      .where(eq(reviewsTable.status, "published")),
  ]);

  const vRow = vRowsResult[0];
  const totalReviewed = replitCountResult[0]?.n;

  return {
    totalBrandsTracked: vRow?.totalBrandsTracked ?? null,
    totalCreativesAnalyzed: vRow?.totalCreativesAnalyzed ?? null,
    totalBrandsWithCelebrityAbuse: vRow?.totalBrandsWithCelebrityAbuse ?? null,
    totalBrandsReviewed: typeof totalReviewed === "number" ? totalReviewed : null,
    avgScamScore: vRow?.avgScamScore ?? null,
    topVelocityTrend: vRow?.topVelocityTrend ?? null,
    topScamBrandName: vRow?.topScamBrandName ?? null,
    topScamBrandScore: vRow?.topScamBrandScore ?? null,
    vercelSyncedAt: vRow?.updatedAt ? new Date(vRow.updatedAt).toISOString() : null,
    replitComputedAt: new Date().toISOString(),
    metadata: (vRow?.metadata as Record<string, unknown> | null) ?? null,
  };
}

// Upsert the vercel-sync row from a sender-provided payload. Caller has
// already verified auth + payload shape; this is the DB write step.
export interface VercelSyncPayload {
  totalBrandsTracked?: number | null;
  totalCreativesAnalyzed?: number | null;
  totalBrandsWithCelebrityAbuse?: number | null;
  avgScamScore?: number | null;
  topVelocityTrend?: string | null;
  topScamBrandName?: string | null;
  topScamBrandScore?: number | null;
  metadata?: Record<string, unknown> | null;
}

export async function upsertVercelSyncRow(payload: VercelSyncPayload): Promise<void> {
  // Drizzle's onConflictDoUpdate doesn't take SQL fragments easily; raw SQL
  // is more readable here and the column list is short.
  await db.execute(sql`
    INSERT INTO platform_aggregates (
      source,
      total_brands_tracked,
      total_creatives_analyzed,
      total_brands_with_celebrity_abuse,
      avg_scam_score,
      top_velocity_trend,
      top_scam_brand_name,
      top_scam_brand_score,
      metadata,
      updated_at
    ) VALUES (
      'vercel-sync',
      ${payload.totalBrandsTracked ?? null},
      ${payload.totalCreativesAnalyzed ?? null},
      ${payload.totalBrandsWithCelebrityAbuse ?? null},
      ${payload.avgScamScore ?? null},
      ${payload.topVelocityTrend ?? null},
      ${payload.topScamBrandName ?? null},
      ${payload.topScamBrandScore ?? null},
      ${payload.metadata ? sql`${JSON.stringify(payload.metadata)}::jsonb` : sql`NULL`},
      NOW()
    )
    ON CONFLICT (source) DO UPDATE SET
      total_brands_tracked = EXCLUDED.total_brands_tracked,
      total_creatives_analyzed = EXCLUDED.total_creatives_analyzed,
      total_brands_with_celebrity_abuse = EXCLUDED.total_brands_with_celebrity_abuse,
      avg_scam_score = EXCLUDED.avg_scam_score,
      top_velocity_trend = EXCLUDED.top_velocity_trend,
      top_scam_brand_name = EXCLUDED.top_scam_brand_name,
      top_scam_brand_score = EXCLUDED.top_scam_brand_score,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
  `);
}
