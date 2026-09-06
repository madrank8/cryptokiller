import {
  BLOG_HUB,
  INVESTIGATIONS_HUB,
  blogUrl,
  reviewUrls,
  type ReviewTranslationRef,
} from "./canonical-urls";

/**
 * Canonical URLs affected by one review sync.
 *
 * The sync endpoint historically treats an omitted review status as published,
 * so this guard intentionally preserves that contract.
 */
export function reviewIndexNowUrlsForSync(
  slug: string,
  status: string | null | undefined,
  translations: ReviewTranslationRef[] = [],
): string[] {
  if ((status ?? "published") !== "published") return [];
  return [...reviewUrls(slug, translations), INVESTIGATIONS_HUB];
}

/** Canonical URLs affected by one blog sync. Omitted status remains a draft. */
export function blogIndexNowUrlsForSync(
  slug: string,
  status: string | null | undefined,
): string[] {
  if ((status ?? "draft") !== "published") return [];
  return [blogUrl(slug), BLOG_HUB];
}