// Single source of truth for the site's public canonical URLs.
//
// These MUST stay byte-identical to what the sitemap generator in
// src/routes/reviews.ts emits — same host, same path shapes, same locale URL
// segments. The sitemap imports these helpers, and the IndexNow ping hooks
// reuse them, so a pinged URL can never drift from the indexed/canonical URL.
//
// The sitemap additionally XML-escapes each <loc> for XML validity; that
// encoding is a property of the XML output context, not of the URL itself, so
// these helpers return the raw (unescaped) URL that IndexNow and the browser
// actually use.

export const HOST = "https://cryptokiller.org";

// Locale URL segments are lowercase ("/it/", "/pt-br/") while DB / hreflang
// values are BCP-47 canonical ("it", "pt-BR"). Keyed by the DB/storage locale,
// mirroring SITEMAP_LOCALE_URL_SEGMENT (now sourced from here).
export const LOCALE_URL_SEGMENT: Record<string, string> = {
  it: "it",
  es: "es",
  de: "de",
  fr: "fr",
  "pt-BR": "pt-br",
};

export interface ReviewTranslationRef {
  /** BCP-47 canonical locale as stored in review_translations (e.g. "pt-BR"). */
  locale: string;
  /** The translation row's OWN slug (may differ from the master slug). */
  slug: string;
}

/** Master (English) canonical review URL. */
export function reviewUrl(slug: string): string {
  return `${HOST}/review/${slug}`;
}

/**
 * Locale-specific review URL, or null if the locale isn't a supported sitemap
 * locale. `slug` is the TRANSLATION's own slug, not the master slug — this is
 * what the sitemap emits for each locale <url> entry.
 */
export function reviewLocaleUrl(locale: string, slug: string): string | null {
  const seg = LOCALE_URL_SEGMENT[locale];
  if (!seg) return null;
  return `${HOST}/${seg}/review/${slug}`;
}

/**
 * Every canonical URL for a review: the master URL plus one per published
 * translation. Pass the same translation set the sitemap emits locale <url>
 * entries for (locale + that translation's own slug).
 */
export function reviewUrls(slug: string, translations: ReviewTranslationRef[] = []): string[] {
  const urls = [reviewUrl(slug)];
  for (const t of translations) {
    const u = reviewLocaleUrl(t.locale, t.slug);
    if (u) urls.push(u);
  }
  return urls;
}

/** Canonical blog post URL. */
export function blogUrl(slug: string): string {
  return `${HOST}/blog/${slug}`;
}

/** Investigations hub landing page. */
export const INVESTIGATIONS_HUB = `${HOST}/investigations`;
