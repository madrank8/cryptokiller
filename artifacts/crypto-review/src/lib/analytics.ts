// Google Analytics 4 (gtag.js) — loaded programmatically so the page ships no
// inline <script> (the CSP has script-src without 'unsafe-inline'; the gtag
// loader origin is explicitly allowed in server/index.ts). The Measurement ID
// is public by design (it appears in page source on every GA-tagged site).
const GA_MEASUREMENT_ID = "G-E529ZZ71JJ";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let initialized = false;

// Production-only: dev previews and local runs must not pollute analytics.
export function initAnalytics(): void {
  if (initialized || !import.meta.env.PROD || typeof window === "undefined") {
    return;
  }
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  // gtag.js expects Arguments objects on the dataLayer (a plain array is not
  // processed for every command), so this must stay a `function` using
  // `arguments`, not an arrow with rest params.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  // send_page_view: false — the SPA router fires page_view explicitly on every
  // route change (including the first), so the automatic initial hit would
  // double-count the landing page.
  window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

export function trackPageview(): void {
  if (!initialized || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: window.location.pathname + window.location.search,
    page_location: window.location.href,
  });
}
