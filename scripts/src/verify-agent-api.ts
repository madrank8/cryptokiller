/**
 * verify-agent-api — end-to-end check that an AI agent following the site's
 * machine-readable discovery documents can actually consume the public API.
 *
 * Flow (exactly what an agent would do):
 *   1. GET {BASE}/.well-known/api-catalog  (RFC 9727 linkset)
 *   2. Follow every service-desc link to the OpenAPI document
 *   3. Exercise each documented GET path, substituting real slugs discovered
 *      from the list endpoints
 *   4. Validate every 200 response body against the response schema in the
 *      OpenAPI spec (JSON Schema 2020-12 via Ajv)
 *   5. Check content types and that list endpoints only expose published rows
 *
 * Fails loudly (non-zero exit, per-check FAIL lines) if any documented
 * endpoint 404s, serves the wrong content type, or drifts from the spec.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run verify:agent-api
 *     -> checks the live site (https://cryptokiller.org)
 *   VERIFY_BASE_URL=http://localhost:80 pnpm --filter @workspace/scripts run verify:agent-api
 *     -> checks a local/dev deployment (catalog hrefs pointing at the
 *        canonical origin are rewritten onto the base URL)
 */

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const CANONICAL_ORIGIN = "https://cryptokiller.org";
const BASE = (process.env.VERIFY_BASE_URL ?? CANONICAL_ORIGIN).replace(/\/+$/, "");
// In development the discovery documents (SSR web server) and the JSON API
// (api-server) run as separate processes, so the API origin can be overridden
// independently. Unset in production, where the shared proxy serves both.
const API_ORIGIN_OVERRIDE = process.env.VERIFY_API_BASE_URL?.replace(/\/+$/, "") ?? null;

const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: true });
addFormats.default(ajv);

let failures = 0;
let checks = 0;

function pass(msg: string): void {
  checks++;
  console.log(`  PASS  ${msg}`);
}

function fail(msg: string): void {
  checks++;
  failures++;
  console.error(`  FAIL  ${msg}`);
}

function rewriteToBase(href: string): string {
  return href.startsWith(CANONICAL_ORIGIN) ? BASE + href.slice(CANONICAL_ORIGIN.length) : href;
}

interface FetchResult {
  status: number;
  contentType: string;
  body: unknown;
  text: string;
}

async function get(url: string): Promise<FetchResult> {
  const res = await fetch(url, {
    headers: { Accept: "application/json, application/linkset+json, application/openapi+json" },
    redirect: "follow",
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* non-JSON body; callers check contentType */
  }
  return { status: res.status, contentType: res.headers.get("content-type") ?? "", body, text };
}

function expectStatus(url: string, r: FetchResult, expected: number): boolean {
  if (r.status === expected) {
    pass(`${url} -> ${r.status}`);
    return true;
  }
  fail(`${url} -> ${r.status} (expected ${expected})`);
  return false;
}

function expectContentType(url: string, r: FetchResult, needle: string): void {
  if (r.contentType.includes(needle)) {
    pass(`${url} content-type "${r.contentType}"`);
  } else {
    fail(`${url} content-type "${r.contentType}" (expected to include "${needle}")`);
  }
}

function validateSchema(url: string, schema: unknown, body: unknown): void {
  if (!schema || typeof schema !== "object") {
    pass(`${url} (no response schema documented — skipped body validation)`);
    return;
  }
  try {
    const validate = ajv.compile(schema as object);
    if (validate(body)) {
      pass(`${url} body matches OpenAPI schema`);
    } else {
      const errs = (validate.errors ?? [])
        .slice(0, 5)
        .map((e) => `${e.instancePath || "/"} ${e.message}`)
        .join("; ");
      fail(`${url} body violates OpenAPI schema: ${errs}`);
    }
  } catch (err) {
    fail(`${url} schema failed to compile: ${(err as Error).message}`);
  }
}

interface OpenApiOperation {
  operationId?: string;
  parameters?: Array<{ name: string; in: string; schema?: { enum?: string[] } }>;
  responses?: Record<
    string,
    { content?: Record<string, { schema?: unknown }> }
  >;
}

interface OpenApiDoc {
  openapi?: string;
  servers?: Array<{ url: string }>;
  paths?: Record<string, { get?: OpenApiOperation }>;
}

function schemaFor(op: OpenApiOperation, status: string): unknown {
  return op.responses?.[status]?.content?.["application/json"]?.schema;
}

async function main(): Promise<void> {
  console.log(`Verifying agent-facing API discovery against ${BASE}\n`);

  // ── Step 1: the api-catalog ──
  console.log("Step 1: /.well-known/api-catalog");
  const catalogUrl = `${BASE}/.well-known/api-catalog`;
  const catalog = await get(catalogUrl);
  if (!expectStatus(catalogUrl, catalog, 200)) {
    console.error("\nCatalog is unreachable — aborting (nothing downstream can be discovered).");
    process.exit(1);
  }
  expectContentType(catalogUrl, catalog, "application/linkset+json");

  const linkset = (catalog.body as { linkset?: unknown })?.linkset;
  if (!Array.isArray(linkset) || linkset.length === 0) {
    fail(`${catalogUrl} body has no non-empty "linkset" array`);
    console.error("\nAborting: cannot follow service-desc links.");
    process.exit(1);
  }
  pass(`${catalogUrl} linkset has ${linkset.length} entries`);

  const serviceDescHrefs = new Set<string>();
  for (const entry of linkset as Array<Record<string, unknown>>) {
    const descs = entry["service-desc"];
    if (!Array.isArray(descs) || descs.length === 0) {
      fail(`linkset entry ${String(entry.anchor)} has no service-desc`);
      continue;
    }
    pass(`linkset entry ${String(entry.anchor)} has service-desc`);
    for (const d of descs as Array<{ href?: string }>) {
      if (d.href) serviceDescHrefs.add(rewriteToBase(d.href));
    }
  }

  // ── Step 2: follow service-desc to the OpenAPI document ──
  console.log("\nStep 2: follow service-desc to the OpenAPI document");
  let spec: OpenApiDoc | null = null;
  let specServerBase = `${BASE}/api`;
  for (const href of serviceDescHrefs) {
    const r = await get(href);
    if (!expectStatus(href, r, 200)) continue;
    expectContentType(href, r, "application/openapi+json");
    const doc = r.body as OpenApiDoc;
    if (!doc?.openapi || !doc.paths) {
      fail(`${href} is not a parseable OpenAPI document`);
      continue;
    }
    pass(`${href} is OpenAPI ${doc.openapi} with ${Object.keys(doc.paths).length} paths`);
    spec = doc;
    const serverUrl = doc.servers?.[0]?.url;
    if (serverUrl) specServerBase = rewriteToBase(serverUrl).replace(/\/+$/, "");
    if (API_ORIGIN_OVERRIDE && serverUrl) {
      specServerBase = API_ORIGIN_OVERRIDE + new URL(serverUrl).pathname.replace(/\/+$/, "");
    }
  }
  if (!spec?.paths) {
    console.error("\nAborting: no usable OpenAPI document was discovered.");
    process.exit(1);
  }

  // ── Step 3: discover real slugs from the list endpoints ──
  console.log("\nStep 3: discover real slugs");
  const reviewsRes = await get(`${specServerBase}/reviews`);
  const reviews = Array.isArray(reviewsRes.body) ? (reviewsRes.body as Array<Record<string, unknown>>) : [];
  const reviewSlug = typeof reviews[0]?.slug === "string" ? (reviews[0].slug as string) : null;
  if (reviewSlug) pass(`found review slug "${reviewSlug}" (${reviews.length} published reviews)`);
  else fail(`${specServerBase}/reviews returned no items with a slug`);

  const blogRes = await get(`${specServerBase}/blog`);
  const blogItems = (blogRes.body as { items?: Array<Record<string, unknown>> })?.items ?? [];
  const blogSlug = typeof blogItems[0]?.slug === "string" ? (blogItems[0].slug as string) : null;
  if (blogSlug) pass(`found blog slug "${blogSlug}" (${blogItems.length} posts on page 1)`);
  else fail(`${specServerBase}/blog returned no items with a slug`);

  // Discover a real (locale, slug) pair for the translations endpoint by
  // scanning review details for a non-empty `translations` array. Without
  // this, the translation path would always be exercised with an EN slug and
  // 404, silently skipping body validation of the translation schema.
  let translationPair: { locale: string; slug: string } | null = null;
  for (const r of reviews.slice(0, 25)) {
    if (typeof r.slug !== "string") continue;
    const detail = await get(`${specServerBase}/reviews/${r.slug}`);
    const translations = (detail.body as { translations?: Array<Record<string, unknown>> })?.translations;
    const t = Array.isArray(translations) ? translations[0] : undefined;
    if (t && typeof t.locale === "string" && typeof t.slug === "string") {
      translationPair = { locale: t.locale, slug: t.slug };
      break;
    }
  }
  if (translationPair) {
    pass(`found published translation "${translationPair.locale}/${translationPair.slug}"`);
  } else {
    console.log("  INFO  no published translation found in first 25 reviews — translation endpoint will be checked as a documented 404");
  }

  // Published-only spot check: list endpoints must not leak drafts.
  const badStatus = reviews.filter(
    (r) => typeof r.status === "string" && /draft|unpublish|pending/i.test(r.status as string),
  );
  if (badStatus.length === 0) pass("review list contains no draft/unpublished statuses");
  else fail(`review list leaked ${badStatus.length} non-published rows (e.g. status="${badStatus[0].status}")`);

  // ── Step 4: exercise every documented GET path ──
  console.log("\nStep 4: exercise every documented path");
  for (const [rawPath, item] of Object.entries(spec.paths)) {
    const op = item.get;
    if (!op) continue;

    let urlPath = rawPath;
    let allow404 = false;

    if (rawPath.includes("{locale}")) {
      if (translationPair) {
        // A real published translation was discovered — exercise it and
        // validate the body against the documented schema. A 404 here would
        // be a genuine failure.
        urlPath = urlPath.replace("{locale}", translationPair.locale).replace("{slug}", translationPair.slug);
      } else {
        // Translations legitimately 404 when no translation exists for the
        // chosen locale/slug pair; the spec documents 404. Any other status is
        // still a failure.
        const locales = op.parameters?.find((p) => p.name === "locale")?.schema?.enum ?? ["it"];
        urlPath = urlPath.replace("{locale}", locales[0]);
        allow404 = true;
      }
    }
    if (rawPath.includes("{slug}")) {
      const slug = rawPath.startsWith("/blog") ? blogSlug : reviewSlug;
      if (!slug) {
        fail(`${rawPath}: no slug available to substitute — skipping would hide drift, counting as failure`);
        continue;
      }
      urlPath = urlPath.replace("{slug}", slug);
    }

    const url = `${specServerBase}${urlPath}`;
    const r = await get(url);

    if (r.status === 200) {
      pass(`GET ${urlPath} -> 200 (${op.operationId ?? rawPath})`);
      expectContentType(url, r, "application/json");
      validateSchema(url, schemaFor(op, "200"), r.body);
    } else if (r.status === 404 && allow404) {
      pass(`GET ${urlPath} -> 404 (documented: no translation for that locale/slug)`);
    } else {
      fail(`GET ${urlPath} -> ${r.status} (${op.operationId ?? rawPath})`);
    }
  }

  // ── Summary ──
  console.log(`\n${checks} checks, ${failures} failure(s)`);
  if (failures > 0) {
    console.error("RESULT: FAIL — the discovery documents drift from what the API actually serves.");
    process.exit(1);
  }
  console.log("RESULT: PASS — an agent following /.well-known/api-catalog can consume the full public API.");
}

main().catch((err) => {
  console.error("verify-agent-api crashed:", err);
  process.exit(1);
});
