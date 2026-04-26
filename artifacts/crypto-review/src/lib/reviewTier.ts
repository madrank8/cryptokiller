/**
 * Threat tier resolution for review pages. Shared by SSR prerender and
 * client JSON-LD so tier-aware copy and schema fallbacks stay aligned.
 */

export type ReviewTier = "confirmed" | "high" | "elevated" | "watchlist" | "low";

export interface TierInfo {
  tier: ReviewTier;
  label: string;
  badge: string;
  frameAsScam: boolean;
}

export function tierFromScore(score: number): TierInfo {
  if (score >= 80) return { tier: "confirmed", label: "Confirmed Scam", badge: "SCAM", frameAsScam: true };
  if (score >= 60) return { tier: "high", label: "High Risk", badge: "HIGH RISK", frameAsScam: true };
  if (score >= 40) return { tier: "elevated", label: "Elevated Concern", badge: "CAUTION", frameAsScam: false };
  if (score >= 20) return { tier: "watchlist", label: "On Watchlist", badge: "WATCHLIST", frameAsScam: false };
  return { tier: "low", label: "Low Signal", badge: "LOW", frameAsScam: false };
}

export function resolveReviewTier(row: {
  threatScore: number | null;
  threatTier: string | null;
  threatLabel: string | null;
  threatBadge: string | null;
  frameAsScam: boolean | null;
}): TierInfo {
  const score = row.threatScore ?? 0;
  const fallback = tierFromScore(score);
  const tier = (row.threatTier as ReviewTier | null) ?? fallback.tier;
  return {
    tier,
    label: row.threatLabel ?? fallback.label,
    badge: row.threatBadge ?? fallback.badge,
    frameAsScam: row.frameAsScam ?? fallback.frameAsScam,
  };
}
