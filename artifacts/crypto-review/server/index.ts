import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response, type NextFunction } from "express";
import { renderPage, type RenderResult } from "./prerender.js";

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

  if (html.includes("<!--SSR-HEAD-INJECT-->")) {
    html = html.replace("<!--SSR-HEAD-INJECT-->", headInject);
  } else {
    html = html.replace("</head>", `${headInject}</head>`);
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
