import { useEffect, useRef } from "react";

interface PageMeta {
  title: string;
  description: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown>;
  author?: string;
  robots?: string;
  prevPage?: string;
  nextPage?: string;
  // Phase 5 — SEO localisation. `htmlLang` sets `<html lang>` (BCP-47 long
  // form: `it-IT`, `pt-BR`, ...). `alternates` emits one hreflang link per
  // entry. `noTranslate` emits `<meta name="googlebot" content="notranslate">`
  // (used on the EN master review page when ≥1 translation exists).
  htmlLang?: string;
  alternates?: Array<{ hreflang: string; href: string }>;
  noTranslate?: boolean;
  // Open Graph locale. OG uses underscore notation (e.g. `en_US`, `it_IT`,
  // `pt_BR`). `ogLocale` sets `og:locale` for the page; `ogLocaleAlternate`
  // emits one `og:locale:alternate` per entry for sibling locales in a
  // translated cluster. Both are optional — unset pages keep the default
  // `en_US` declared in index.html.
  ogLocale?: string;
  ogLocaleAlternate?: string[];
}

const SITE_NAME = "CryptoKiller";
const BASE_URL = "https://cryptokiller.org";
const DEFAULT_IMAGE = `${BASE_URL}/opengraph.jpg`;

function normalizeCanonical(url: string): string {
  if (url === "/" || url === BASE_URL || url === `${BASE_URL}/`) {
    return `${BASE_URL}/`;
  }
  return url.replace(/\/+$/, "");
}

function deriveCanonical(explicit?: string): string {
  if (explicit) return normalizeCanonical(explicit);
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return normalizeCanonical(`${BASE_URL}${path}`);
}

export function usePageMeta({ title, description, canonical, ogType, ogImage, jsonLd, author, robots, prevPage, nextPage, htmlLang, alternates, noTranslate, ogLocale, ogLocaleAlternate }: PageMeta) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    document.title = fullTitle;

    const resolvedCanonical = deriveCanonical(canonical);

    setMeta("description", description);
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:url", resolvedCanonical, true);
    setMeta("og:type", ogType || "website", true);
    setMeta("og:image", ogImage || DEFAULT_IMAGE, true);
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImage || DEFAULT_IMAGE);

    // og:locale — only update when the page specifies a non-default locale.
    // The index.html shell carries the default `en_US`; we reset to it on
    // cleanup so SPA nav back to an English page doesn't keep a stale locale.
    if (ogLocale) {
      setMeta("og:locale", ogLocale, true);
    }
    // og:locale:alternate — wipe previous set tagged with our marker before
    // re-emitting so SPA nav between locale pages doesn't accumulate stale
    // entries. SSR-injected og:locale:alternate tags carry data-ssr="1" and
    // are also cleared here.
    document
      .querySelectorAll<HTMLMetaElement>(
        'meta[property="og:locale:alternate"][data-oglocale], meta[property="og:locale:alternate"][data-ssr]',
      )
      .forEach((el) => el.remove());
    if (ogLocaleAlternate && ogLocaleAlternate.length > 0) {
      for (const loc of ogLocaleAlternate) {
        const el = document.createElement("meta");
        el.setAttribute("property", "og:locale:alternate");
        el.content = loc;
        el.setAttribute("data-oglocale", "1");
        document.head.appendChild(el);
      }
    }

    if (author) setMeta("author", author);
    if (robots) setMeta("robots", robots);

    setLink("prev", prevPage);
    setLink("next", nextPage);

    let linkCanonical = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.rel = "canonical";
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.href = resolvedCanonical;

    // Phase 5 — `<html lang>` mirror for crawlers / browsers that only see
    // the hydrated DOM. Reset to `en` on cleanup so SPA nav back to a
    // non-localised page (home, blog, etc.) doesn't keep a stale lang.
    if (htmlLang) {
      document.documentElement.lang = htmlLang;
    }

    // Phase 5 — hreflang alternates. Wipe any previous set tagged with our
    // marker attribute before re-emitting so SPA nav between locale pages
    // doesn't accumulate stale links. SSR's `data-ssr="1"` hreflang links
    // are stripped on the first CSR pass too (the SPA owns the head after
    // hydration).
    document
      .querySelectorAll<HTMLLinkElement>("link[rel='alternate'][data-hreflang]")
      .forEach((el) => el.remove());
    document
      .querySelectorAll<HTMLLinkElement>("link[rel='alternate'][hreflang][data-ssr]")
      .forEach((el) => el.remove());
    if (alternates && alternates.length > 0) {
      for (const a of alternates) {
        const link = document.createElement("link");
        link.rel = "alternate";
        link.hreflang = a.hreflang;
        link.href = a.href;
        link.setAttribute("data-hreflang", "1");
        document.head.appendChild(link);
      }
    }

    // Phase 5 — googlebot=notranslate. SSR may have injected one tagged
    // `data-ssr="1"`; CSR uses `data-notranslate="1"`. On every effect
    // run we strip BOTH variants so SPA navigation can't leak a stale
    // notranslate from a previous EN-with-translations page onto an
    // unrelated route, and we never end up with duplicate googlebot
    // metas. Then re-emit (CSR-owned) only when this page actually
    // wants notranslate.
    document
      .querySelectorAll<HTMLMetaElement>(
        'meta[name="googlebot"][data-ssr], meta[name="googlebot"][data-notranslate]',
      )
      .forEach((el) => el.remove());
    if (noTranslate) {
      const noTranslateEl = document.createElement("meta");
      noTranslateEl.name = "googlebot";
      noTranslateEl.content = "notranslate";
      noTranslateEl.setAttribute("data-notranslate", "1");
      document.head.appendChild(noTranslateEl);
    }

    // CSR replaces SSR JSON-LD scripts so crawlers that execute JS only see
    // this block — it must match server/prerender.ts (Review.itemReviewed,
    // #item-reviewed, etc.). See reviewItemReviewedSchema.ts.
    document
      .querySelectorAll<HTMLScriptElement>("script[data-ssr-jsonld]")
      .forEach((el) => el.remove());

    let scriptEl = document.querySelector<HTMLScriptElement>("script[data-page-jsonld]");
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.type = "application/ld+json";
        scriptEl.setAttribute("data-page-jsonld", "true");
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      const el = document.querySelector<HTMLScriptElement>("script[data-page-jsonld]");
      if (el) el.remove();
      if (author) {
        const authorEl = document.querySelector<HTMLMetaElement>('meta[name="author"]');
        if (authorEl) authorEl.content = "CryptoKiller Research Team";
      }
      if (robots) {
        const robotsEl = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
        if (robotsEl) robotsEl.content = "index, follow";
      }
      setLink("prev", undefined);
      setLink("next", undefined);
      // og:locale cleanup — reset to en_US (index.html default) and remove
      // any og:locale:alternate tags so SPA nav back to English pages doesn't
      // keep a stale translated locale.
      if (ogLocale) {
        setMeta("og:locale", "en_US", true);
      }
      document
        .querySelectorAll<HTMLMetaElement>('meta[property="og:locale:alternate"][data-oglocale]')
        .forEach((e) => e.remove());
      // Phase 5 cleanup — reset html lang to en, drop hreflang alternates,
      // strip notranslate meta. Mirrors the SSR default so SPA navigation
      // between locale-prefixed and root routes doesn't leak stale i18n
      // state across pages.
      if (htmlLang) document.documentElement.lang = "en";
      document
        .querySelectorAll<HTMLLinkElement>("link[rel='alternate'][data-hreflang]")
        .forEach((e) => e.remove());
      document
        .querySelectorAll<HTMLMetaElement>(
          'meta[name="googlebot"][data-ssr], meta[name="googlebot"][data-notranslate]',
        )
        .forEach((e) => e.remove());
    };
  }, [title, description, canonical, ogType, ogImage, jsonLd, author, robots, prevPage, nextPage, htmlLang, alternates, noTranslate, ogLocale, ogLocaleAlternate]);
}

function setLink(rel: string, href: string | undefined) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"][data-page-link]`);
  if (href) {
    if (!el) {
      el = document.createElement("link");
      el.rel = rel;
      el.setAttribute("data-page-link", "true");
      document.head.appendChild(el);
    }
    el.href = href;
  } else if (el) {
    el.remove();
  }
}

function setMeta(key: string, value: string, isProperty = false) {
  const attr = isProperty ? "property" : "name";
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

export function useGlobalJsonLd(schema: Record<string, unknown>) {
  const serialized = useRef("");
  useEffect(() => {
    const json = JSON.stringify(schema);
    if (json === serialized.current) return;
    serialized.current = json;

    let el = document.querySelector<HTMLScriptElement>("script[data-global-jsonld]");
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.setAttribute("data-global-jsonld", "true");
      document.head.appendChild(el);
    }
    el.textContent = json;
  }, [schema]);
}
