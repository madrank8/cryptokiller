// Shared i18n constants and helpers for translated review pages.
// Single source of truth — consumed by:
//   - artifacts/crypto-review (CSR + SSR)
//   - artifacts/api-server (sitemap)
// Adding a new locale here lights it up everywhere.

export type TranslationLocale = "it" | "es" | "de" | "fr" | "pt-BR";

// Map of internal locale key → BCP-47 hreflang code emitted in
// <link rel="alternate" hreflang="…"> and JSON-LD inLanguage.
export const LOCALE_HREFLANG: Record<string, string> = {
  it: "it",
  es: "es",
  de: "de",
  fr: "fr",
  "pt-BR": "pt-BR",
};

// Human-readable English language label used in the translation
// disclosure prose ("…translated into [Language]…"). English copy is
// intentional for V1 — the disclosure itself is editorial chrome.
export const LOCALE_LANGUAGE_LABEL_EN: Record<string, string> = {
  it: "Italian",
  es: "Spanish",
  de: "German",
  fr: "French",
  "pt-BR": "Brazilian Portuguese",
};

// translation_method DB enum → user-facing prose. Unknown values fall
// back to a generic label in callers instead of leaking the enum.
export const TRANSLATION_METHOD_LABEL: Record<string, string> = {
  ai_full: "AI translation",
  ai_assisted: "AI-assisted translation, editorially reviewed",
  human_only: "Human translation",
};

// Format an ISO timestamp (or Date) with a BCP-47 locale so the date
// reads naturally in the target language (e.g. "18 maggio 2026" on /it,
// "May 18, 2026" on the English master). Returns "" on null/invalid
// so callers can collapse the surrounding clause.
export function formatLocaleDate(
  iso: string | Date | null | undefined,
  bcp47: string,
): string {
  if (!iso) return "";
  try {
    const d = iso instanceof Date ? iso : new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(bcp47, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

// Stale-translation threshold: a translation is "stale" when the
// source_review_updated_at it was built from lags the current master
// row.updated_at by more than this many milliseconds. Shared by the
// API (response shape) and SSR (banner rendering) so they cannot drift.
export const STALE_TRANSLATION_THRESHOLD_MS = 60 * 60 * 1000;
