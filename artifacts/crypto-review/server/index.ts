import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response, type NextFunction } from "express";
import compression from "compression";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { renderPage, type RenderResult } from "./prerender.js";

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

async function loadIndexHtml(): Promise<void> {
  indexHtml = await fs.readFile(INDEX_HTML_PATH, "utf-8");
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

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(r.title)}</title>`);

  const replaceAttr = (pattern: RegExp, value: string): void => {
    html = html.replace(pattern, (match) => match.replace(/content="[^"]*"/, `content="${escapeAttr(value)}"`));
  };

  replaceAttr(/<meta name="description"[^>]*>/, r.description);
  replaceAttr(/<meta name="robots"[^>]*>/, r.robots ?? "index, follow");
  replaceAttr(/<meta property="og:type"[^>]*>/, r.ogType);
  replaceAttr(/<meta property="og:title"[^>]*>/, r.title);
  replaceAttr(/<meta property="og:description"[^>]*>/, r.description);
  replaceAttr(/<meta property="og:url"[^>]*>/, r.canonical);
  replaceAttr(/<meta property="og:image"[^>]*>/, r.ogImage);
  replaceAttr(/<meta name="twitter:title"[^>]*>/, r.title);
  replaceAttr(/<meta name="twitter:description"[^>]*>/, r.description);
  replaceAttr(/<meta name="twitter:image"[^>]*>/, r.ogImage);

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

  if (html.includes("<!--SSR-HEAD-INJECT-->")) {
    html = html.replace("<!--SSR-HEAD-INJECT-->", headInject);
  } else {
    html = html.replace("</head>", `${headInject}</head>`);
  }

  // Phase 5 — `<html lang>` reflects the page locale (BCP-47 long form like
  // `it-IT`, `pt-BR`). Skipped when the renderer didn't set it (static
  // pages stay at the index.html default of `en`).
  if (r.htmlLang) {
    html = html.replace(/<html\b[^>]*\blang="[^"]*"/i, (m) =>
      m.replace(/lang="[^"]*"/, `lang="${escapeAttr(r.htmlLang!)}"`));
  }

  if (html.includes("<!--SSR-BODY-START-->") && html.includes("<!--SSR-BODY-END-->")) {
    html = html.replace(
      /<!--SSR-BODY-START-->[\s\S]*?<!--SSR-BODY-END-->/,
      `<!--SSR-BODY-START-->${r.bodyHtml}<!--SSR-BODY-END-->`,
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
// errors). Kept permissive enough not to break the one external script the
// site loads (Google AdSense) or Google Fonts, while still adding
// clickjacking, MIME-sniffing, referrer, permissions, and CSP injection
// defence-in-depth.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  // 'unsafe-inline'/'unsafe-eval'/blob: are required by Google AdSense and by
  // the inline JSON-LD + adsbygoogle bootstrap scripts the page emits.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.googleadservices.com https://*.google.com https://*.gstatic.com https://*.doubleclick.net https://adservice.google.com",
  // Inline styles are used throughout (SSR fallback markup + React style={{}})
  // alongside the Google Fonts stylesheet.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' https:",
  // AdSense renders its ad units inside iframes served from these origins.
  "frame-src 'self' https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com",
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

// Convention: search engines and humans look for /sitemap.xml at the
// site root. The canonical location is /api/sitemap.xml (built
// dynamically from the DB, including all locale alternates). 301 here
// preserves a single canonical URL while making the conventional path
// work. Registered before static + SSR so neither intercepts it.
app.get("/sitemap.xml", (_req: Request, res: Response) => {
  res.redirect(301, "/api/sitemap.xml");
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
    const markdown = renderResultToMarkdown(result);

    res.status(result.status);
    if (result.lastModified) {
      res.setHeader("Last-Modified", result.lastModified);
    }
    res.setHeader(
      "Cache-Control",
      result.status === 200 ? "public, max-age=300, stale-while-revalidate=600" : "no-store",
    );
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
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
    const html = applyMeta(indexHtml, result);

    res.status(result.status);
    if (result.lastModified) {
      res.setHeader("Last-Modified", result.lastModified);
    }
    res.setHeader(
      "Cache-Control",
      result.status === 200 ? "public, max-age=300, stale-while-revalidate=600" : "no-store",
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
