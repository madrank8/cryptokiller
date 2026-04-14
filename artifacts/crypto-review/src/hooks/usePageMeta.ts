import { useEffect } from "react";

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

export function usePageMeta({ title, description, canonical, ogType, ogImage, jsonLd, author, robots, prevPage, nextPage }: PageMeta) {
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
    };
  }, [title, description, canonical, ogType, ogImage, jsonLd, author, robots, prevPage, nextPage]);
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
