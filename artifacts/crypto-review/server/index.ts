import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response, type NextFunction } from "express";
import compression from "compression";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { renderPage, type RenderResult } from "./prerender.js";
import { getIndexNowKey } from "./indexnow.js";

const nhm = new NodeHtmlMarkdown();

// Agent Readiness — render a page's SSR result as a Markdown source document.
// Leads with the title as an H1, then the meta description as a blockquote,
// then the Markdown conversion of the page's rendered body HTML.
function renderResultToMarkdown(result: RenderResult): string {
  const parts: string[] = [];
  if (result.title) parts.push(`# ${result.title}`);
  if (result.description) parts.push(`> ${result.description}`);
  const body = nhm.translate(result.bodyHtml ?? "").trim();
  if (body) parts.push(body);
  return parts.join("\n\n") + "\n";
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawPort = process.env.PORT;
if (!rawPort) {
  throw new Error("PORT environment variable is required");
}
const PORT = Number(rawPort);
if (!Number.isFinite(PORT) || PORT <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const PUBLIC_DIR = path.resolve(__dirname, "../public");
const INDEX_HTML_PATH = path.join(PUBLIC_DIR, "index.html");

let indexHtml = "";

// Performance (The Website Specification — preload/preconnect): preload the
// above-the-fold self-hosted Inter weights so the hero/LCP text paints without a
// font swap. Filenames are content-hashed at build time, so we discover them
// from the built assets dir rather than hardcoding. Font fetches are always in
// CORS mode, so `crossorigin` is required even for same-origin preloads.
async function buildFontPreloadLinks(): Promise<string> {
  try {
    const assetsDir = path.join(PUBLIC_DIR, "assets");
    const files = await fs.readdir(assetsDir);
    const wanted = ["inter-latin-400-normal-", "inter-latin-700-normal-"];
    const links: string[] = [];
    for (const prefix of wanted) {
      const file = files.find((f) => f.startsWith(prefix) && f.endsWith(".woff2"));
      if (file) {
        links.push(
          `<link rel="preload" as="font" type="font/woff2" href="/assets/${file}" crossorigin>`,
        );
      }
    }
    return links.join("");
  } catch {
    return "";
  }
}

async function loadIndexHtml(): Promise<void> {
  let html = await fs.readFile(INDEX_HTML_PATH, "utf-8");
  const fontPreloads = await buildFontPreloadLinks();
  if (fontPreloads) {
    html = html.includes("<!--SSR-HEAD-INJECT-->")
      ? html.replace("<!--SSR-HEAD-INJECT-->", () => `${fontPreloads}<!--SSR-HEAD-INJECT-->`)
      : html.replace("</head>", () => `${fontPreloads}</head>`);
  }
  indexHtml = html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function escapeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function applyMeta(template: string, r: RenderResult): string {
  let html = template;

  // NOTE: every dynamic value below is inserted via a replacement *function*,
  // never a replacement *string*. String.prototype.replace interprets `$&`,
  // `$\``, `$'`, `$$` and `$n` in a replacement string as special patterns, so
  // DB-sourced content containing a `$` (e.g. "$300" in scam ad copy) would
  // otherwise splice the matched/surrounding HTML — including the whole <head>
  // and its JSON-LD <script> — into the output. A function return value is
  // inserted literally, with no `$` interpretation, which is the correct fix.
  html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(r.title)}</title>`);

  const replaceAttr = (pattern: RegExp, value: string): void => {
    html = html.replace(pattern, (match) => match.replace(/content="[^"]*"/, () => `content="${escapeAttr(value)}"`));
  };

  replaceAttr(/<meta name="description"[^>]*>/, r.description);
  replaceAttr(/<meta name="robots"[^>]*>/, r.robots ?? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
  replaceAttr(/<meta property="og:type"[^>]*>/, r.ogType);
  replaceAttr(/<meta property="og:title"[^>]*>/, r.title);
  replaceAttr(/<meta property="og:description"[^>]*>/, r.description);
  replaceAttr(/<meta property="og:url"[^>]*>/, r.canonical);
  replaceAttr(/<meta property="og:image"[^>]*>/, r.ogImage);
  // og:locale — replace the shell's default `en_US` in-place rather than
  // appending a second tag. When the renderer doesn't specify a locale (non-
  // review pages) the existing `en_US` stays untouched.
  if (r.ogLocale) {
    replaceAttr(/<meta property="og:locale"[^>]*>/, r.ogLocale);
  }
  replaceAttr(/<meta name="twitter:title"[^>]*>/, r.title);
  replaceAttr(/<meta name="twitter:description"[^>]*>/, r.description);
  replaceAttr(/<meta name="twitter:image"[^>]*>/, r.ogImage);
  // <meta name="author"> — only rewrite when the renderer supplies a
  // page-specific value (review/blog-post pages with a known persona).
  // Pages that don't set `author` keep whatever the static index.html
  // template ships with (currently the corporate "CryptoKiller Research
  // Team" default), so the home/investigations/static pages are
  // unaffected by this hook.
  if (r.author) {
    replaceAttr(/<meta name="author"[^>]*>/, r.author);
  }

  let headInject = `<link rel="canonical" href="${escapeAttr(r.canonical)}" data-ssr="1" />`;
  if (r.jsonLd) {
    headInject += `<script type="application/ld+json" data-ssr-jsonld="1">${escapeJsonLd(r.jsonLd)}</script>`;
  }
  if (r.prevPage) {
    headInject += `<link rel="prev" href="${escapeAttr(r.prevPage)}" data-ssr="1" />`;
  }
  if (r.nextPage) {
    headInject += `<link rel="next" href="${escapeAttr(r.nextPage)}" data-ssr="1" />`;
  }
  // Phase 5 — hreflang alternates. Bidirectional reciprocity is required:
  // every page in the cluster (EN master + each locale) emits the SAME
  // alternate set including self. Order doesn't matter to Google but we
  // emit in the order the renderer supplied (en first, locales next,
  // x-default last) for log readability.
  if (r.alternates && r.alternates.length > 0) {
    for (const a of r.alternates) {
      headInject += `<link rel="alternate" hreflang="${escapeAttr(a.hreflang)}" href="${escapeAttr(a.href)}" data-ssr="1" />`;
    }
  }
  // Phase 5 — googlebot=notranslate on EN master review pages when ≥1
  // editorial translation exists. Stops Google's Translated Results from
  // shipping a machine translation that competes with our editorial one.
  if (r.noTranslate) {
    headInject += `<meta name="googlebot" content="notranslate" data-ssr="1" />`;
  }
  // og:locale:alternate — one tag per sibling locale, injected into <head>.
  // The og:locale value itself was already written by replaceAttr above.
  if (r.ogLocaleAlternates && r.ogLocaleAlternates.length > 0) {
    for (const alt of r.ogLocaleAlternates) {
      headInject += `<meta property="og:locale:alternate" content="${escapeAttr(alt)}" data-ssr="1" />`;
    }
  }

  if (html.includes("<!--SSR-HEAD-INJECT-->")) {
    html = html.replace("<!--SSR-HEAD-INJECT-->", () => headInject);
  } else {
    html = html.replace("</head>", () => `${headInject}</head>`);
  }

  // Phase 5 — `<html lang>` reflects the page locale (BCP-47 long form like
  // `it-IT`, `pt-BR`). Skipped when the renderer didn't set it (static
  // pages stay at the index.html default of `en`).
  if (r.htmlLang) {
    html = html.replace(/<html\b[^>]*\blang="[^"]*"/i, (m) =>
      m.replace(/lang="[^"]*"/, () => `lang="${escapeAttr(r.htmlLang!)}"`));
  }

  if (html.includes("<!--SSR-BODY-START-->") && html.includes("<!--SSR-BODY-END-->")) {
    html = html.replace(
      /<!--SSR-BODY-START-->[\s\S]*?<!--SSR-BODY-END-->/,
      () => `<!--SSR-BODY-START-->${r.bodyHtml}<!--SSR-BODY-END-->`,
    );
  }

  return html;
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);

// ─── Compression (The Website Specification — Performance) ───
// gzip/deflate text responses (HTML, markdown, JS, CSS, JSON, SVG). Registered
// first so every downstream response (static assets + SSR HTML) is compressed
// for clients that send Accept-Encoding. compression appends `Accept-Encoding`
// to any existing Vary header via on-headers, so the handlers' `Vary: Accept`
// is preserved as `Vary: Accept, Accept-Encoding`.
app.use(compression());

// ─── Security headers (The Website Specification — Security category) ───
// Applied to every response (static assets, SSR HTML, markdown, redirects,
// errors). The site loads no third-party scripts, styles, or fonts (AdSense was
// removed and Inter is self-hosted), so the CSP can be strict while adding
// clickjacking, MIME-sniffing, referrer, permissions, and CSP injection
// defence-in-depth.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  // The app ships its own bundled, same-origin JS plus Google Analytics
  // (gtag.js), which the client injects programmatically from
  // www.googletagmanager.com — no inline snippet, so 'unsafe-inline'/
  // 'unsafe-eval' are still not needed. The only inline <script> the page
  // emits is escaped JSON-LD (type application/ld+json), a data block not
  // governed by script-src. GA beacons go to google-analytics.com collect
  // endpoints, already covered by connect-src/img-src https:.
  "script-src 'self' https://www.googletagmanager.com",
  // Inline styles are used throughout (SSR fallback markup + React style={{}}).
  // Fonts are self-hosted, so no external stylesheet origins are required.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  // Inter is self-hosted from same-origin /assets; data: covers inlined glyphs.
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const PERMISSIONS_POLICY =
  "geolocation=(), camera=(), microphone=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), midi=()";

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", PERMISSIONS_POLICY);
  res.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  next();
});

// ─── /.well-known/security.txt (RFC 9116) ───
// express.static ignores dotfiles by default, so this is served explicitly.
const SECURITY_TXT = [
  "Contact: mailto:security@cryptokiller.org",
  "Expires: 2027-06-03T00:00:00.000Z",
  "Preferred-Languages: en",
  "Canonical: https://cryptokiller.org/.well-known/security.txt",
  "",
].join("\n");

app.get("/.well-known/security.txt", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(SECURITY_TXT);
});

// ─── Machine-readable API discovery ───
// Two related documents for AI agents / automated clients:
//   /openapi.json            : OpenAPI 3.1 description of the PUBLIC read API
//   /.well-known/api-catalog : RFC 9727 linkset pointing at it
//
// Scope rule: this describes ONLY the unauthenticated read endpoints that
// artifacts/api-server already serves to the public (/api/reviews*, /api/blog*,
// /api/healthz). The Bearer-gated /api/sync/* and /api/admin/* routes are
// deliberately omitted: cataloguing them would advertise private surface and
// they are not usable by third parties anyway.
//
// Note lib/api-spec/openapi.yaml is an INTERNAL contract (it documents
// /sync/review and predates the blog routes); it is intentionally not the file
// published here.
const PUBLIC_ORIGIN = "https://cryptokiller.org";

const REVIEW_SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "integer" },
    slug: { type: "string" },
    platformName: { type: "string" },
    threatScore: { type: "integer", minimum: 0, maximum: 100, description: "Higher is more dangerous." },
    verdict: { type: "string" },
    status: { type: "string" },
    investigationDate: { type: "string", format: "date-time" },
    adCreatives: { type: "integer" },
    countriesTargeted: { type: "integer" },
    daysActive: { type: "integer" },
    celebritiesAbused: { type: "integer" },
  },
} as const;

const OPENAPI_DOC = {
  openapi: "3.1.0",
  info: {
    title: "CryptoKiller Public API",
    version: "1.0.0",
    description:
      "Read-only access to CryptoKiller's published crypto scam investigations and research. " +
      "No authentication is required. Threat scores are editorially independent: CryptoKiller " +
      "cannot be paid to remove or modify listings.",
    license: { name: "Content is (c) DEX Algo Technologies Pte Ltd; attribution required." },
  },
  servers: [{ url: `${PUBLIC_ORIGIN}/api`, description: "Public API base" }],
  tags: [
    { name: "reviews", description: "Published scam investigations" },
    { name: "blog", description: "Research and guides" },
    { name: "health", description: "Service status" },
  ],
  paths: {
    "/reviews": {
      get: {
        operationId: "listReviews",
        tags: ["reviews"],
        summary: "List all published investigations",
        responses: {
          "200": {
            description: "Published investigations",
            content: {
              "application/json": { schema: { type: "array", items: REVIEW_SUMMARY_SCHEMA } },
            },
          },
        },
      },
    },
    "/reviews/{slug}": {
      get: {
        operationId: "getReview",
        tags: ["reviews"],
        summary: "Get one investigation by slug",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Investigation detail",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ...REVIEW_SUMMARY_SCHEMA.properties,
                    summary: { type: "string" },
                    methodologyText: { type: "string" },
                    disclaimerText: { type: "string" },
                    author: { type: "string" },
                    readingMinutes: { type: "integer" },
                    heroImageUrl: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          "404": { description: "No published investigation with that slug" },
        },
      },
    },
    "/reviews/{slug}/related": {
      get: {
        operationId: "getRelatedReviews",
        tags: ["reviews"],
        summary: "Related investigations for a slug",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Related investigations",
            content: { "application/json": { schema: { type: "array", items: REVIEW_SUMMARY_SCHEMA } } },
          },
        },
      },
    },
    "/reviews/translations/{locale}/{slug}": {
      get: {
        operationId: "getReviewTranslation",
        tags: ["reviews"],
        summary: "Localised investigation, when a translation exists",
        parameters: [
          { name: "locale", in: "path", required: true, schema: { type: "string", enum: ["it", "es", "de", "fr", "pt-br"] } },
          { name: "slug", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Translated investigation" },
          "404": { description: "No translation for that locale and slug" },
        },
      },
    },
    "/blog": {
      get: {
        operationId: "listBlogPosts",
        tags: ["blog"],
        summary: "List published research and guides",
        responses: {
          "200": {
            description: "Blog index",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          slug: { type: "string" },
                          title: { type: "string" },
                          headline: { type: "string" },
                          summary: { type: "string" },
                          metaDescription: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/blog/{slug}": {
      get: {
        operationId: "getBlogPost",
        tags: ["blog"],
        summary: "Get one post by slug",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Post detail" },
          "404": { description: "No published post with that slug" },
        },
      },
    },
    "/healthz": {
      get: {
        operationId: "healthCheck",
        tags: ["health"],
        summary: "Service status",
        responses: {
          "200": {
            description: "Healthy",
            content: {
              "application/json": {
                schema: { type: "object", properties: { status: { type: "string", examples: ["ok"] } } },
              },
            },
          },
        },
      },
    },
  },
};

app.get("/openapi.json", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/openapi+json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(OPENAPI_DOC);
});

// RFC 9727 (api-catalog) + RFC 9264 (linkset). One entry per public API, each
// carrying: service-desc (the OpenAPI doc), service-doc (human docs), and
// status (the live health endpoint).
const API_CATALOG = {
  linkset: [
    {
      anchor: `${PUBLIC_ORIGIN}/api/reviews`,
      "service-desc": [{ href: `${PUBLIC_ORIGIN}/openapi.json`, type: "application/openapi+json" }],
      "service-doc": [{ href: `${PUBLIC_ORIGIN}/methodology`, type: "text/html", title: "How CryptoKiller investigates and scores" }],
      status: [{ href: `${PUBLIC_ORIGIN}/api/healthz`, type: "application/json" }],
    },
    {
      anchor: `${PUBLIC_ORIGIN}/api/blog`,
      "service-desc": [{ href: `${PUBLIC_ORIGIN}/openapi.json`, type: "application/openapi+json" }],
      "service-doc": [{ href: `${PUBLIC_ORIGIN}/blog`, type: "text/html", title: "CryptoKiller research and guides" }],
      status: [{ href: `${PUBLIC_ORIGIN}/api/healthz`, type: "application/json" }],
    },
  ],
};

app.get("/.well-known/api-catalog", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/linkset+json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(JSON.stringify(API_CATALOG, null, 2));
});

// Convention: search engines and humans look for /sitemap.xml at the
// site root. The canonical location is /api/sitemap.xml (built
// dynamically from the DB, including all locale alternates). 301 here
// preserves a single canonical URL while making the conventional path
// work. Registered before static + SSR so neither intercepts it.
app.get("/sitemap.xml", (_req: Request, res: Response) => {
  res.redirect(301, "/api/sitemap.xml");
});

// IndexNow ownership verification file. Search engines (Bing/Yandex/Seznam)
// fetch https://<host>/<key>.txt and confirm the body matches the key before
// honouring IndexNow submissions. Served at the domain root, before static +
// the SSR catch-all. Only registered when INDEXNOW_KEY is set.
const indexNowKey = getIndexNowKey();
if (indexNowKey) {
  app.get(`/${indexNowKey}.txt`, (_req: Request, res: Response) => {
    res.type("text/plain").send(indexNowKey);
  });
}

// === Legacy plural-URL redirects (301). Must run before the renderPage
// handlers (markdown + HTML) so retired plural page URLs 301 to their live
// singular equivalents instead of hard-404ing and wasting crawl budget.
// Placed here (after the /sitemap.xml redirect, before static + both
// renderPage callers) so the redirect fires regardless of Accept type.
// The plural /api/reviews/* JSON routes live in artifacts/api-server and are
// intentionally untouched.
const LOCALES = ["it", "es", "de", "fr", "pt-br"];
const DEAD_BLOG: Record<string, string> = {
  "/blog/ai-deepfake-crypto-scam": "/blog",
  // add other confirmed-removed blog slugs here -> target
};

app.use((req: Request, res: Response, next: NextFunction) => {
  const [pathOnly, ...rest] = req.originalUrl.split("?");
  const qs = rest.length ? "?" + rest.join("?") : "";
  const p = pathOnly.replace(/\/+$/, "") || "/";
  let target: string | null = null;

  if (DEAD_BLOG[p]) target = DEAD_BLOG[p];

  if (!target) {
    const m = p.match(/^\/reviews\/translations\/([^/]+)\/([^/]+)$/);
    if (m && LOCALES.includes(m[1])) target = `/${m[1]}/review/${m[2]}`;
  }
  if (!target) {
    const m = p.match(/^\/reviews\/([^/]+)(?:\/.*)?$/);
    if (m && m[1] !== "translations") target = `/review/${m[1]}`;
  }
  if (!target && p === "/reviews") target = "/investigations";

  if (target && target !== p) {
    res.redirect(301, target + qs);
    return;
  }
  next();
});

// ─── Canonical URL normalization ───
// Must run before express.static and the SSR catch-all so every response is
// served at exactly one URL. Two non-canonical forms are normalised:
//
//   1. /index.html → /
//      express.static (with index:false) still serves an explicit /index.html
//      request, bypassing the SSR applyMeta() path and exposing the raw Vite
//      shell as a duplicate homepage. 301 here closes that gap.
//
//   2. /about/ → /about  (any non-root trailing-slash path)
//      renderPage() strips the slash for route matching but still returns 200
//      for the raw trailing-slash URL. 301 here makes the slashless form the
//      only canonical URL that returns 200.
//
// Query strings are preserved on all redirects.
app.use((req: Request, res: Response, next: NextFunction) => {
  const [pathOnly, ...rest] = req.originalUrl.split("?");
  const qs = rest.length ? "?" + rest.join("?") : "";

  if (pathOnly === "/index.html") {
    res.redirect(301, "/" + qs);
    return;
  }

  if (pathOnly.length > 1 && pathOnly.endsWith("/")) {
    res.redirect(301, pathOnly.replace(/\/+$/, "") + qs);
    return;
  }

  next();
});

app.use(
  express.static(PUBLIC_DIR, {
    index: false,
    maxAge: "1y",
    setHeaders(res, filePath) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".html" || ext === ".txt" || ext === ".xml" || ext === ".json") {
        res.setHeader("Cache-Control", "public, max-age=300");
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }),
);

app.get("/healthz", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Agent Readiness — Markdown source endpoints. A `.md` suffix on any
// routable page (e.g. `/index.md` → `/`, `/review/foo.md` → `/review/foo`)
// returns the same page rendered as Markdown. `Accept: text/markdown` on a
// normal page URL is honoured the same way. This lets agents fetch a clean
// source variant of the canonical HTML page.
function markdownTargetPath(reqPath: string): string | null {
  if (reqPath.endsWith(".md")) {
    const stripped = reqPath.slice(0, -3);
    // `/index.md` is the Markdown variant of the homepage.
    if (stripped === "/index" || stripped === "") return "/";
    return stripped || "/";
  }
  return null;
}

app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();

  const accept = String(req.headers.accept ?? "");
  const wantsMarkdownByAccept =
    !path.extname(req.path) && accept.includes("text/markdown");
  const targetFromSuffix = markdownTargetPath(req.path);

  if (!wantsMarkdownByAccept && targetFromSuffix === null) return next();

  const targetPath = targetFromSuffix ?? req.path;
  const query = (req.originalUrl || req.url).split("?")[1];
  const renderUrl = query ? `${targetPath}?${query}` : targetPath;

  try {
    const result = await renderPage(renderUrl);

    if (result.redirectTo) {
      res.redirect(result.status, result.redirectTo);
      return;
    }

    const markdown = renderResultToMarkdown(result);

    res.status(result.status);
    if (result.lastModified) {
      res.setHeader("Last-Modified", result.lastModified);
    }
    // Cache freshness — dynamic, DB-backed pages (reviews/blog) carry a
    // Last-Modified derived from the row's updated_at, so the sync pipeline
    // can bust them. For those we revalidate on every request (max-age=0,
    // must-revalidate) so admin edits surface on the next load instead of
    // being masked by a 5-minute stale-while-revalidate window. Static pages
    // (no lastModified) keep the longer cached/SWR window.
    res.setHeader(
      "Cache-Control",
      result.status === 200
        ? result.lastModified
          ? "public, max-age=0, must-revalidate"
          : "public, max-age=300, stale-while-revalidate=600"
        : "no-store",
    );
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    // Crawlability — the Markdown response is an alternate representation of
    // the canonical HTML page, not a distinct page. Mark it non-indexable so
    // search engines don't treat `*.md` URLs (or `Accept: text/markdown`
    // variants) as duplicate content and split ranking signals. `follow`
    // keeps link equity flowing, and the resource stays fully fetchable for
    // agents (we intentionally do NOT block it in robots.txt).
    res.setHeader("X-Robots-Tag", "noindex, follow");
    // Agent Readiness — advertise the sitemap and the canonical HTML variant
    // of this Markdown source via the Link header.
    const htmlHref = targetPath === "/" ? "/" : targetPath;
    res.setHeader("Link", [
      `</sitemap.xml>; rel="sitemap"`,
      `<${htmlHref}>; rel="alternate"; type="text/html"`,
    ].join(", "));
    res.setHeader("Vary", "Accept");

    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.send(markdown);
  } catch (err) {
    console.error("[markdown] error rendering", req.path, err);
    next(err);
  }
});

app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (path.extname(req.path)) return next();

  const accept = String(req.headers.accept ?? "");
  const isHtmlRequest = accept === "" || accept.includes("text/html") || accept.includes("*/*") || accept.includes("application/xhtml");
  if (!isHtmlRequest) return next();

  try {
    const result = await renderPage(req.originalUrl || req.url);

    if (result.redirectTo) {
      res.redirect(result.status, result.redirectTo);
      return;
    }

    const html = applyMeta(indexHtml, result);

    res.status(result.status);
    if (result.lastModified) {
      res.setHeader("Last-Modified", result.lastModified);
    }
    // Cache freshness — dynamic, DB-backed pages (reviews/blog) carry a
    // Last-Modified derived from the row's updated_at, so the sync pipeline
    // can bust them. For those we revalidate on every request (max-age=0,
    // must-revalidate) so admin edits surface on the next load instead of
    // being masked by a 5-minute stale-while-revalidate window. Static pages
    // (no lastModified) keep the longer cached/SWR window.
    res.setHeader(
      "Cache-Control",
      result.status === 200
        ? result.lastModified
          ? "public, max-age=0, must-revalidate"
          : "public, max-age=300, stale-while-revalidate=600"
        : "no-store",
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // Agent Readiness — advertise the sitemap and the Markdown source variant
    // of this page via the Link header so agents can discover related
    // resources without parsing the HTML body.
    const mdHref = req.path === "/" ? "/index.md" : `${req.path.replace(/\/$/, "")}.md`;
    res.setHeader("Link", [
      `</sitemap.xml>; rel="sitemap"`,
      `<${mdHref}>; rel="alternate"; type="text/markdown"`,
    ].join(", "));
    res.setHeader("Vary", "Accept");

    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.send(html);
  } catch (err) {
    console.error("[prerender] error rendering", req.path, err);
    next(err);
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[server] unhandled error", err);
  if (res.headersSent) return;
  res.status(500).type("text/plain").send("Internal Server Error");
});

async function start(): Promise<void> {
  await loadIndexHtml();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[crypto-review] listening on :${PORT}`);
  });
}

start().catch((err) => {
  console.error("[crypto-review] failed to start", err);
  process.exit(1);
});
