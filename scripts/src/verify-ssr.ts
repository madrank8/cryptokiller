type AuditResult = {
  url: string;
  status: number;
  wordCount: number;
  hasJsonLd: boolean;
  hasBase44Leak: boolean;
  canonicalOk: boolean;
  hasOrganizationSameAs: boolean;
  schemaTemplateOk: boolean;
  reviewItemReviewedOk: boolean;
  passed: boolean;
  reason?: string;
};

const CANONICAL_ORIGIN = "https://cryptokiller.org";
const BASE_URL = (
  process.env.SSR_AUDIT_BASE_URL ?? CANONICAL_ORIGIN
).replace(/\/+$/, "");
const API_BASE_URL = (
  process.env.SSR_AUDIT_API_BASE_URL ?? BASE_URL
).replace(/\/+$/, "");
const GOOGLEBOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const HOMEPAGE_REVIEW_LINK_TARGET = 20;
const INVESTIGATIONS_PAGE_SIZE = 50;
const RELATED_LINK_MINIMUM = 6;
const RELATED_LINK_MAXIMUM = 10;

const STATIC_PATHS = [
  "/",
  "/about",
  "/methodology",
  "/recovery",
  "/report",
  "/privacy",
  "/terms",
  "/investigations",
  "/blog",
];

function uniq(values: string[]): string[] {
  return [...new Set(values)];
}

function extractLocsFromSitemap(xml: string): string[] {
  const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/gi)];
  return matches
    .map((m) =>
      m[1]
        .trim()
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'"),
    )
    .filter(Boolean);
}

async function collectSitemapUrls(rootUrl: string): Promise<string[]> {
  const pending = [rootUrl];
  const visited = new Set<string>();
  const urls: string[] = [];
  while (pending.length > 0) {
    const candidate = new URL(pending.shift()!, BASE_URL);
    const key = `${candidate.pathname}${candidate.search}`;
    if (visited.has(key)) {
      throw new Error(`duplicate or cyclic sitemap child ${key}`);
    }
    visited.add(key);
    const { status, text } = await fetchText(`${API_BASE_URL}${key}`);
    if (status !== 200) {
      throw new Error(`sitemap child ${key} returned ${status}`);
    }
    const locations = extractLocsFromSitemap(text);
    if (/<sitemapindex\b/i.test(text)) {
      if (locations.length === 0) {
        throw new Error(`sitemap index ${key} contains no children`);
      }
      pending.push(...locations);
    } else if (/<urlset\b/i.test(text)) {
      urls.push(...locations);
    } else {
      throw new Error(`unexpected sitemap root at ${key}`);
    }
  }
  if (new Set(urls).size !== urls.length) {
    throw new Error("flattened sitemap contains duplicate canonical URLs");
  }
  return urls;
}

type HtmlAnchor = {
  rel: string[];
  path: string;
};

function extractAnchors(html: string): HtmlAnchor[] {
  const parsed: HtmlAnchor[] = [];
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = match[0];
    const href = tag.match(/\bhref=(["'])(.*?)\1/i)?.[2];
    if (!href) continue;
    const rel =
      tag
        .match(/\brel=(["'])(.*?)\1/i)?.[2]
        ?.toLowerCase()
        .split(/\s+/)
        .filter(Boolean) ?? [];
    try {
      const url = new URL(href, BASE_URL);
      parsed.push({ rel, path: `${url.pathname}${url.search}` });
    } catch {
      // Other route checks cover malformed markup. Discovery auditing only
      // needs valid crawler-visible anchors.
    }
  }
  return parsed;
}

function uniquePaths(html: string, prefix: string): string[] {
  return [
    ...new Set(
      extractAnchors(html)
        .map((anchor) => anchor.path.split("?")[0])
        .filter((path) => path.startsWith(prefix)),
    ),
  ];
}

async function auditDiscoveryLinks(sitemapPaths: string[]): Promise<string[]> {
  const failures: string[] = [];
  const publishedReviewPaths = uniq(
    sitemapPaths.filter((path) => /^\/review\/[^/]+$/.test(path)),
  );
  const publishedBlogPaths = uniq(
    sitemapPaths.filter((path) => /^\/blog\/[^/]+$/.test(path)),
  );

  if (publishedReviewPaths.length === 0) {
    return ["sitemap exposes no published /review/ URLs to validate"];
  }

  try {
    const home = await fetchText(`${BASE_URL}/`);
    const actual = uniquePaths(home.text, "/review/").length;
    const expected = Math.min(
      HOMEPAGE_REVIEW_LINK_TARGET,
      publishedReviewPaths.length,
    );
    if (actual < expected) {
      failures.push(
        `homepage exposes ${actual} unique review links; expected at least ${expected}`,
      );
    }
  } catch (error) {
    failures.push(`homepage discovery fetch failed: ${(error as Error).message}`);
  }

  try {
    const pageOne = await fetchText(`${BASE_URL}/investigations`);
    const pageOneLinks = uniquePaths(pageOne.text, "/review/");
    const expectedPageOne = Math.min(
      INVESTIGATIONS_PAGE_SIZE,
      publishedReviewPaths.length,
    );
    if (pageOneLinks.length < expectedPageOne) {
      failures.push(
        `/investigations exposes ${pageOneLinks.length} unique review links; expected at least ${expectedPageOne}`,
      );
    }

    if (publishedReviewPaths.length > INVESTIGATIONS_PAGE_SIZE) {
      const pageTwo = await fetchText(`${BASE_URL}/investigations?page=2`);
      const pageTwoLinks = uniquePaths(pageTwo.text, "/review/");
      const expectedPageTwo = Math.min(
        INVESTIGATIONS_PAGE_SIZE,
        publishedReviewPaths.length - INVESTIGATIONS_PAGE_SIZE,
      );
      if (pageTwoLinks.length < expectedPageTwo) {
        failures.push(
          `/investigations?page=2 exposes ${pageTwoLinks.length} unique review links; expected at least ${expectedPageTwo}`,
        );
      }
      const overlap = pageTwoLinks.filter((path) => pageOneLinks.includes(path));
      if (overlap.length > 0) {
        failures.push(
          `/investigations pages 1 and 2 overlap on ${overlap.length} review link(s)`,
        );
      }
      const hasPreviousAnchor = extractAnchors(pageTwo.text).some(
        (anchor) =>
          anchor.path === "/investigations" && anchor.rel.includes("prev"),
      );
      if (!hasPreviousAnchor) {
        failures.push(
          "/investigations?page=2 has no real rel=prev anchor to /investigations",
        );
      }
    }
  } catch (error) {
    failures.push(
      `investigations discovery fetch failed: ${(error as Error).message}`,
    );
  }

  try {
    const blog = await fetchText(`${BASE_URL}/blog`);
    const blogLinks = uniquePaths(blog.text, "/blog/");
    if (blogLinks.length < publishedBlogPaths.length) {
      failures.push(
        `/blog exposes ${blogLinks.length} unique post links; sitemap has ${publishedBlogPaths.length}`,
      );
    }
  } catch (error) {
    failures.push(`blog discovery fetch failed: ${(error as Error).message}`);
  }

  try {
    const currentPath = publishedReviewPaths[0];
    const review = await fetchText(`${BASE_URL}${currentPath}`);
    const section =
      review.text.match(
        /<section[^>]*data-related-investigations[^>]*>[\s\S]*?<\/section>/i,
      )?.[0] ?? "";
    const relatedLinks = uniquePaths(section, "/review/");
    const expectedMinimum = Math.min(
      RELATED_LINK_MINIMUM,
      Math.max(0, publishedReviewPaths.length - 1),
    );
    if (
      relatedLinks.length < expectedMinimum ||
      relatedLinks.length > RELATED_LINK_MAXIMUM
    ) {
      failures.push(
        `${currentPath} exposes ${relatedLinks.length} related review links; expected ${expectedMinimum}–${RELATED_LINK_MAXIMUM}`,
      );
    }
    if (relatedLinks.includes(currentPath)) {
      failures.push(`${currentPath} includes itself as a related review link`);
    }
  } catch (error) {
    failures.push(`related-link discovery fetch failed: ${(error as Error).message}`);
  }

  return failures;
}

function stripHtmlToWords(html: string): number {
  const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const noStyle = noScript.replace(/<style[\s\S]*?<\/style>/gi, " ");
  const plain = noStyle.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return 0;
  return plain.split(" ").filter(Boolean).length;
}

async function fetchText(url: string): Promise<{ status: number; text: string }> {
  const bust = `_ssr_audit_ts=${Date.now()}`;
  const fetchUrl = url.includes("?") ? `${url}&${bust}` : `${url}?${bust}`;
  const res = await fetch(fetchUrl, {
    headers: {
      "user-agent": GOOGLEBOT_UA,
      accept: "text/html,application/xhtml+xml",
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
  });
  return { status: res.status, text: await res.text() };
}

function normalizeUrl(input: string): string {
  const u = new URL(input);
  const path = u.pathname === "/" ? "/" : u.pathname.replace(/\/+$/, "");
  return `${u.origin}${path}${u.search}`;
}

function verifyCanonicalNormalizationFixture(): void {
  const hub = `${CANONICAL_ORIGIN}/investigations`;
  const pageTwo = `${hub}?page=2`;
  if (normalizeUrl(hub) === normalizeUrl(pageTwo)) {
    throw new Error(
      "canonical normalization must preserve pagination query parameters",
    );
  }
}

function extractCanonicalHref(html: string): string | null {
  const canonicalMatch = html.match(
    /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i,
  );
  return canonicalMatch?.[1]?.trim() ?? null;
}

function extractJsonLdNodes(html: string): Array<Record<string, unknown>> {
  const scriptMatches = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];

  const nodes: Array<Record<string, unknown>> = [];
  for (const m of scriptMatches) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") nodes.push(item as Record<string, unknown>);
        }
      } else if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        if (Array.isArray(obj["@graph"])) {
          for (const item of obj["@graph"] as unknown[]) {
            if (item && typeof item === "object") nodes.push(item as Record<string, unknown>);
          }
        } else {
          nodes.push(obj);
        }
      }
    } catch {
      // Non-fatal: malformed JSON-LD blocks should not crash the audit.
    }
  }
  return nodes;
}

function nodeType(node: Record<string, unknown>): string | null {
  const t = node["@type"];
  if (typeof t === "string") return t;
  if (Array.isArray(t)) {
    const first = t.find((x) => typeof x === "string");
    if (typeof first === "string") return first;
  }
  return null;
}

function classifyTemplate(path: string): "home" | "static" | "review" | "blog" | "other" {
  if (path === "/") return "home";
  if (path === "/blog" || path.startsWith("/blog/")) return "blog";
  if (path.startsWith("/review/") || path.startsWith("/investigations/")) return "review";
  if (
    ["/about", "/methodology", "/recovery", "/report", "/privacy", "/terms", "/investigations"].includes(path)
  ) {
    return "static";
  }
  return "other";
}

function hasAnyType(typeSet: Set<string>, types: string[]): boolean {
  return types.some((t) => typeSet.has(t));
}

/** Rich-result-safe types for schema.org Review.itemReviewed (Thing is invalid). */
const DISALLOWED_ITEM_REVIEWED_TYPES = new Set(["Thing"]);

/**
 * On /review/* pages, ensure each Review.itemReviewed resolves to a typed
 * entity — not a bare #platform ref or schema.org/Thing (regression guard
 * for CSR JSON-LD replacing SSR blocks after hydration).
 */
function reviewItemReviewedGraphOk(pathname: string, nodes: Array<Record<string, unknown>>): boolean {
  if (!pathname.startsWith("/review/")) return true;

  const byId = new Map<string, Record<string, unknown>>();
  for (const n of nodes) {
    const id = typeof n["@id"] === "string" ? (n["@id"] as string) : null;
    if (id) byId.set(id, n);
  }

  const reviews = nodes.filter((n) => {
    const t = nodeType(n);
    if (t === "Review") return true;
    if (Array.isArray(n["@type"])) {
      return (n["@type"] as unknown[]).some((x) => x === "Review");
    }
    return false;
  });

  if (reviews.length === 0) return false;

  for (const rev of reviews) {
    const ir = rev.itemReviewed as unknown;
    if (!ir || typeof ir !== "object" || Array.isArray(ir)) return false;
    const o = ir as Record<string, unknown>;
    const refId = typeof o["@id"] === "string" ? o["@id"] : null;
    if (refId && refId.endsWith("#platform")) return false;

    let resolved: Record<string, unknown> | null = null;
    if (typeof o["@type"] === "string") resolved = o;
    else if (refId) resolved = byId.get(refId) ?? null;

    if (!resolved) return false;
    const rt = nodeType(resolved);
    if (!rt || DISALLOWED_ITEM_REVIEWED_TYPES.has(rt)) return false;
  }

  return true;
}

function schemaTemplatePass(path: string, typeSet: Set<string>): boolean {
  const template = classifyTemplate(path);
  const hasOrg = typeSet.has("Organization");
  const hasSite = typeSet.has("WebSite");

  if (!hasOrg || !hasSite) return false;

  switch (template) {
    case "home":
      return hasAnyType(typeSet, ["WebPage", "CollectionPage", "ItemList"]);
    case "static":
      return hasAnyType(typeSet, ["BreadcrumbList", "WebPage", "AboutPage", "CollectionPage", "ItemList"]);
    case "review":
      return hasAnyType(typeSet, ["Article", "Review", "WebPage", "Dataset"]);
    case "blog":
      return hasAnyType(typeSet, ["Blog", "BlogPosting", "Article", "CollectionPage"]);
    default:
      return hasAnyType(typeSet, ["WebPage", "BreadcrumbList", "Article", "CollectionPage"]);
  }
}

function auditPage(url: string, status: number, html: string): AuditResult {
  const parsedUrl = new URL(url);
  const pathname = parsedUrl.pathname;
  const wordCount = stripHtmlToWords(html);
  const hasJsonLd = /<script[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html);
  const hasBase44Leak = html.includes("crypto-killer.base44.app");
  const hasSsrMarkers = html.includes('data-ssr="1"') || html.includes('data-ssr-jsonld="1"');
  const canonicalHref = extractCanonicalHref(html);
  const expectedCanonical = `${CANONICAL_ORIGIN}${pathname}${parsedUrl.search}`;
  const canonicalOk =
    !!canonicalHref &&
    normalizeUrl(canonicalHref) === normalizeUrl(expectedCanonical);
  const nodes = extractJsonLdNodes(html);
  const typeSet = new Set(nodes.map(nodeType).filter((x): x is string => !!x));
  const schemaTemplateOk = schemaTemplatePass(pathname, typeSet);
  const hasOrganizationSameAs = nodes.some((n) => {
    if (nodeType(n) !== "Organization") return false;
    const sameAsValue = n.sameAs;
    return Array.isArray(sameAsValue) && sameAsValue.length > 0;
  });
  const reviewItemReviewedOk = reviewItemReviewedGraphOk(pathname, nodes);

  let passed = true;
  const reasons: string[] = [];

  if (status !== 200) {
    passed = false;
    reasons.push(`status=${status}`);
  }
  if (wordCount < 80) {
    passed = false;
    reasons.push(`thin_html_words=${wordCount}`);
  }
  if (!hasJsonLd) {
    passed = false;
    reasons.push("missing_jsonld");
  }
  if (hasBase44Leak) {
    passed = false;
    reasons.push("base44_leak");
  }
  if (!canonicalOk) {
    passed = false;
    reasons.push("canonical_mismatch_or_missing");
  }
  if (!hasOrganizationSameAs) {
    passed = false;
    reasons.push("organization_sameAs_empty");
  }
  if (!schemaTemplateOk) {
    passed = false;
    reasons.push("missing_required_schema_node_for_template");
  }
  if (!reviewItemReviewedOk) {
    passed = false;
    reasons.push("review_itemReviewed_invalid_or_unresolved");
  }
  // For this stack, SSR markers should be present on rendered pages.
  if (!hasSsrMarkers) {
    passed = false;
    reasons.push("missing_ssr_markers");
  }

  return {
    url,
    status,
    wordCount,
    hasJsonLd,
    hasBase44Leak,
    canonicalOk,
    hasOrganizationSameAs,
    schemaTemplateOk,
    reviewItemReviewedOk,
    passed,
    reason: reasons.length ? reasons.join(",") : undefined,
  };
}

async function main(): Promise<void> {
  verifyCanonicalNormalizationFixture();
  const robotsUrl = `${BASE_URL}/robots.txt`;
  const sitemapUrl =
    API_BASE_URL === BASE_URL
      ? `${BASE_URL}/sitemap.xml`
      : `${API_BASE_URL}/api/sitemap.xml`;

  const routes: string[] = [...STATIC_PATHS];
  let sitemapPaths: string[] = [];

  try {
    sitemapPaths = (await collectSitemapUrls(sitemapUrl)).map((location) => {
      const parsed = new URL(location);
      return `${parsed.pathname}${parsed.search}`;
    });
    routes.push(...sitemapPaths);
  } catch {
    // Non-fatal: static routes are still audited.
  }

  const finalRoutes = uniq(
    routes
      .map((p) => (p.startsWith("/") ? p : `/${p}`))
      .map((p) => (p === "/" ? p : p.replace(/\/+$/, ""))),
  );

  const results: AuditResult[] = [];
  for (const path of finalRoutes) {
    const url = `${BASE_URL}${path}`;
    try {
      const { status, text } = await fetchText(url);
      results.push(auditPage(url, status, text));
    } catch (err) {
      results.push({
        url,
        status: 0,
        wordCount: 0,
        hasJsonLd: false,
        hasBase44Leak: false,
        canonicalOk: false,
        hasOrganizationSameAs: false,
        schemaTemplateOk: false,
        reviewItemReviewedOk: false,
        passed: false,
        reason: `fetch_error:${String(err)}`,
      });
    }
  }

  // robots/sitemap sanity
  const robots = await fetchText(robotsUrl).catch(() => ({ status: 0, text: "" }));
  const robotsHasContentSignal = /^Content-Signal:\s*search=yes,\s*ai-input=yes,\s*ai-train=yes\s*$/m.test(
    robots.text,
  );
  const sitemapDirectives = Array.from(
    robots.text.matchAll(/^Sitemap:\s*(\S+)\s*$/gim),
    (match) => match[1],
  );
  const robotsHasCanonicalSitemap =
    sitemapDirectives.length === 1 &&
    sitemapDirectives[0] === "https://cryptokiller.org/api/sitemap.xml";
  const robotsOk =
    robots.status === 200 &&
    robotsHasContentSignal &&
    robotsHasCanonicalSitemap;
  const discoveryFailures = await auditDiscoveryLinks(sitemapPaths);

  const failed = results.filter((r) => !r.passed);
  console.log(`SSR audit base: ${BASE_URL}`);
  console.log(`Routes checked: ${results.length}`);
  console.log(`robots.txt: ${robots.status}`);
  console.log(`Passed: ${results.length - failed.length}`);
  console.log(`Failed: ${failed.length}`);

  if (!robotsOk) {
    console.log(
      `FAIL robots.txt status=${robots.status} contentSignal=${robotsHasContentSignal}`,
      `canonicalSitemap=${robotsHasCanonicalSitemap}`,
    );
  }

  for (const r of failed) {
    console.log(`FAIL ${r.url} :: ${r.reason ?? "unknown"}`);
  }

  if (discoveryFailures.length === 0) {
    console.log("PASS crawlable discovery links");
  } else {
    for (const failure of discoveryFailures) {
      console.log(`FAIL discovery :: ${failure}`);
    }
  }

  if (!robotsOk || failed.length > 0 || discoveryFailures.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("SSR audit crashed:", err);
  process.exit(1);
});
