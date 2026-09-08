import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HOST } from "../src/canonical-urls.ts";
import { STATIC_SITEMAP_PATHS } from "../src/lib/sitemap-pages.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_SOURCE_PATH = path.resolve(
  __dirname,
  "../../crypto-review/src/App.tsx",
);
const WEB_BASE_URL = (
  process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:45871"
).replace(/\/+$/, "");
const API_BASE_URL = (
  process.env.VERIFY_API_BASE_URL ?? "http://127.0.0.1:45872"
).replace(/\/+$/, "");

// These routes are indexable, but their concrete sitemap URLs come from
// published database/registry records rather than the literal static list.
// Any new parameterized frontend route must be classified here explicitly.
const DYNAMIC_ROUTE_EXCLUSIONS = new Map<string, string>([
  ["/review/:slug", "published reviews generate their own sitemap URLs"],
  [
    "/:locale/review/:slug",
    "published translations generate locale sitemap URLs",
  ],
  ["/blog/:slug", "published posts generate their own sitemap URLs"],
  ["/author/:slug", "the shared author registry generates profile URLs"],
]);

// There are currently no exact private/admin/noindex routes in App.tsx. Add
// any future route here with a reason so its omission from the sitemap is
// deliberate rather than accidental.
const EXACT_ROUTE_EXCLUSIONS = new Map<string, string>();

// The pathless Switch fallback is the explicit noindex 404 exclusion.
const PATHLESS_ROUTE_EXCLUSIONS = [
  {
    signature: /\bcomponent\s*=\s*\{NotFound\}/,
    label: "NotFound fallback",
    reason: "unknown paths render a 404 with noindex, follow",
  },
] as const;

function duplicates(values: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function assertNoDuplicates(values: readonly string[], label: string): void {
  const repeated = duplicates(values);
  assert.equal(
    repeated.length,
    0,
    `${label} contains duplicate path(s): ${repeated.join(", ")}`,
  );
}

interface RouteTag {
  source: string;
  line: number;
}

function extractRouteTags(source: string): RouteTag[] {
  const tags: RouteTag[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf("<Route", cursor);
    if (start < 0) break;
    const nextCharacter = source[start + "<Route".length] ?? "";
    if (/\w/.test(nextCharacter)) {
      cursor = start + "<Route".length;
      continue;
    }

    let braceDepth = 0;
    let quote: "'" | '"' | "`" | undefined;
    let escaped = false;
    let end = -1;
    for (let index = start + "<Route".length; index < source.length; index += 1) {
      const character = source[index];
      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === quote) {
          quote = undefined;
        }
        continue;
      }
      if (character === "'" || character === '"' || character === "`") {
        quote = character;
      } else if (character === "{") {
        braceDepth += 1;
      } else if (character === "}") {
        braceDepth = Math.max(0, braceDepth - 1);
      } else if (
        character === "/" &&
        source[index + 1] === ">" &&
        braceDepth === 0
      ) {
        end = index + 2;
        break;
      }
    }

    const line = source.slice(0, start).split("\n").length;
    assert.notEqual(end, -1, `unterminated <Route> declaration at App.tsx:${line}`);
    tags.push({ source: source.slice(start, end), line });
    cursor = end;
  }
  return tags;
}

function routeTagSummary(tag: RouteTag): string {
  return tag.source.replace(/\s+/g, " ").slice(0, 180);
}

type TopLevelPathAttribute =
  | { kind: "absent" }
  | { kind: "literal"; value: string }
  | { kind: "nonliteral" };

function readQuotedLiteral(
  source: string,
  start: number,
): { value: string; end: number } | undefined {
  const quote = source[start];
  if (quote !== "'" && quote !== '"') return undefined;
  let value = "";
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (character === "\\") {
      const escaped = source[index + 1];
      if (escaped === undefined) return undefined;
      value += escaped;
      index += 1;
    } else if (character === quote) {
      return { value, end: index + 1 };
    } else {
      value += character;
    }
  }
  return undefined;
}

function extractTopLevelPathAttribute(tag: RouteTag): TopLevelPathAttribute {
  let braceDepth = 0;
  let quote: "'" | '"' | "`" | undefined;
  let escaped = false;
  for (let index = "<Route".length; index < tag.source.length; index += 1) {
    const character = tag.source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") {
      braceDepth += 1;
      continue;
    }
    if (character === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (braceDepth !== 0 || !tag.source.startsWith("path", index)) continue;

    const before = tag.source[index - 1] ?? " ";
    const after = tag.source[index + "path".length] ?? " ";
    if (/[\w:-]/.test(before) || /[\w:-]/.test(after)) continue;

    let cursor = index + "path".length;
    while (/\s/.test(tag.source[cursor] ?? "")) cursor += 1;
    if (tag.source[cursor] !== "=") continue;
    cursor += 1;
    while (/\s/.test(tag.source[cursor] ?? "")) cursor += 1;

    const directLiteral = readQuotedLiteral(tag.source, cursor);
    if (directLiteral) {
      return { kind: "literal", value: directLiteral.value };
    }
    if (tag.source[cursor] !== "{") return { kind: "nonliteral" };

    cursor += 1;
    while (/\s/.test(tag.source[cursor] ?? "")) cursor += 1;
    const expressionLiteral = readQuotedLiteral(tag.source, cursor);
    if (!expressionLiteral) return { kind: "nonliteral" };
    cursor = expressionLiteral.end;
    while (/\s/.test(tag.source[cursor] ?? "")) cursor += 1;
    if (tag.source[cursor] !== "}") return { kind: "nonliteral" };
    return { kind: "literal", value: expressionLiteral.value };
  }
  return { kind: "absent" };
}

function verifyRouteParserFixtures(): void {
  const fixtures = extractRouteTags(`
    <Route component={() => <Page path="/nested-child" />} path="/actual" />
    <Route
      path={"/multiline"}
      component={() => <Page />}
    />
  `);
  assert.deepEqual(
    fixtures.map((tag) => extractTopLevelPathAttribute(tag)),
    [
      { kind: "literal", value: "/actual" },
      { kind: "literal", value: "/multiline" },
    ],
    "Route parser must ignore nested JSX path props and accept multiline literal attributes",
  );
}

function extractFrontendStaticPaths(source: string): string[] {
  const routeTags = extractRouteTags(source);
  const pathRoutes: string[] = [];
  const pathlessCounts = new Map<string, number>();
  for (const tag of routeTags) {
    const pathAttribute = extractTopLevelPathAttribute(tag);
    if (pathAttribute.kind === "literal") {
      pathRoutes.push(pathAttribute.value);
      continue;
    }
    if (pathAttribute.kind === "nonliteral") {
      assert.fail(
        `non-literal route path at App.tsx:${tag.line}; use a literal so sitemap parity can identify it: ${routeTagSummary(tag)}`,
      );
    }
    const matchingExclusions = PATHLESS_ROUTE_EXCLUSIONS.filter((exclusion) =>
      exclusion.signature.test(tag.source),
    );
    assert.equal(
      matchingExclusions.length,
      1,
      `unclassified pathless route at App.tsx:${tag.line}: ${routeTagSummary(tag)}`,
    );
    const label = matchingExclusions[0].label;
    pathlessCounts.set(label, (pathlessCounts.get(label) ?? 0) + 1);
  }

  for (const exclusion of PATHLESS_ROUTE_EXCLUSIONS) {
    const count = pathlessCounts.get(exclusion.label) ?? 0;
    assert.equal(
      count,
      1,
      `${exclusion.label} exclusion must appear exactly once (${exclusion.reason})`,
    );
  }

  assertNoDuplicates(pathRoutes, "App.tsx route declarations");
  const declared = new Set(pathRoutes);
  for (const [routePath, reason] of DYNAMIC_ROUTE_EXCLUSIONS) {
    assert.ok(
      declared.has(routePath),
      `stale dynamic-route exclusion ${routePath}: ${reason}`,
    );
  }
  for (const [routePath, reason] of EXACT_ROUTE_EXCLUSIONS) {
    assert.ok(
      declared.has(routePath),
      `stale exact-route exclusion ${routePath}: ${reason}`,
    );
  }

  return pathRoutes.filter((routePath) => {
    if (routePath.includes(":")) {
      assert.ok(
        DYNAMIC_ROUTE_EXCLUSIONS.has(routePath),
        `unclassified parameterized route: ${routePath}`,
      );
      return false;
    }
    if (EXACT_ROUTE_EXCLUSIONS.has(routePath)) return false;
    return true;
  });
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractAttribute(tag: string, name: string): string | undefined {
  const match = tag.match(
    new RegExp(
      `\\b${name}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>]+))`,
      "i",
    ),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function extractCanonicalDeclarations(
  html: string,
): Array<{ href: string | undefined }> {
  return Array.from(html.matchAll(/<link\b[^>]*>/gi))
    .filter((match) => {
      const rel = extractAttribute(match[0], "rel");
      return rel?.toLowerCase().split(/\s+/).includes("canonical");
    })
    .map((match) => ({ href: extractAttribute(match[0], "href") }));
}

function extractRobotsDirectives(html: string): string[] {
  return Array.from(html.matchAll(/<meta\b[^>]*>/gi))
    .filter((match) => {
      const name = extractAttribute(match[0], "name")?.toLowerCase() ?? "";
      return (
        name === "robots" ||
        name.endsWith("bot") ||
        name.startsWith("googlebot")
      );
    })
    .map((match) => extractAttribute(match[0], "content") ?? "");
}

function parseSitemapLocations(xml: string): string[] {
  const root = xml.match(
    /^\s*<\?xml\b[\s\S]*?\?>\s*<urlset\b[^>]*>([\s\S]*)<\/urlset>\s*$/i,
  );
  assert.ok(root, "sitemap XML must contain one well-formed <urlset> root");
  const innerXml = root[1];
  const urlPattern = /<url\b[^>]*>[\s\S]*?<\/url>/gi;
  const urlBlocks = Array.from(innerXml.matchAll(urlPattern), (match) => match[0]);
  const unparsed = innerXml.replace(urlPattern, "").trim();
  assert.equal(
    unparsed,
    "",
    `sitemap XML contains malformed content outside <url> entries: ${unparsed.slice(0, 120)}`,
  );
  assert.ok(urlBlocks.length > 0, "sitemap XML contains no <url> entries");

  return urlBlocks.map((block, index) => {
    const locations = Array.from(
      block.matchAll(/<loc>([\s\S]*?)<\/loc>/gi),
      (match) => match[1].trim(),
    );
    assert.equal(
      locations.length,
      1,
      `sitemap <url> entry ${index + 1} must contain exactly one <loc>`,
    );
    assert.equal(
      /<[^>]+>/.test(locations[0]),
      false,
      `sitemap <url> entry ${index + 1} has markup inside <loc>`,
    );
    return decodeXml(locations[0]);
  });
}

function parseSitemapIndexLocations(xml: string): string[] {
  const root = xml.match(
    /^\s*<\?xml\b[\s\S]*?\?>\s*<sitemapindex\b[^>]*>([\s\S]*)<\/sitemapindex>\s*$/i,
  );
  assert.ok(root, "root sitemap XML must contain one well-formed <sitemapindex>");
  const innerXml = root[1];
  const sitemapPattern =
    /<sitemap\b[^>]*>[\s\S]*?<\/sitemap>/gi;
  const sitemapBlocks = Array.from(
    innerXml.matchAll(sitemapPattern),
    (match) => match[0],
  );
  const unparsed = innerXml.replace(sitemapPattern, "").trim();
  assert.equal(
    unparsed,
    "",
    `sitemap index contains malformed content: ${unparsed.slice(0, 120)}`,
  );
  assert.ok(sitemapBlocks.length > 0, "sitemap index contains no children");
  return sitemapBlocks.map((block, index) => {
    const locations = Array.from(
      block.matchAll(/<loc>([\s\S]*?)<\/loc>/gi),
      (match) => match[1].trim(),
    );
    assert.equal(
      locations.length,
      1,
      `sitemap index child ${index + 1} must contain exactly one <loc>`,
    );
    return decodeXml(locations[0]);
  });
}

async function fetchText(url: string, redirect: RequestRedirect): Promise<{
  response: Response;
  body: string;
}> {
  const response = await fetch(url, {
    redirect,
    signal: AbortSignal.timeout(15_000),
  });
  return { response, body: await response.text() };
}

async function verifyIndexableStaticPage(routePath: string): Promise<void> {
  const expectedCanonical = `${HOST}${routePath}`;
  const { response, body } = await fetchText(
    `${WEB_BASE_URL}${routePath}`,
    "manual",
  );
  assert.equal(
    response.status,
    200,
    `${routePath}: expected direct HTTP 200, received ${response.status}${response.headers.get("location") ? ` redirect to ${response.headers.get("location")}` : ""}`,
  );

  const headerRobots = response.headers.get("x-robots-tag") ?? "";
  const metaRobots = extractRobotsDirectives(body);
  const noindex = [headerRobots, ...metaRobots].some((value) =>
    /(?:^|[\s,;])noindex(?:$|[\s,;])/i.test(value),
  );
  assert.equal(
    noindex,
    false,
    `${routePath}: sitemap entry resolves to noindex`,
  );

  const canonicalDeclarations = extractCanonicalDeclarations(body);
  assert.equal(
    canonicalDeclarations.length,
    1,
    `${routePath}: expected exactly one canonical declaration, found ${canonicalDeclarations.length}`,
  );
  assert.equal(
    canonicalDeclarations[0].href,
    expectedCanonical,
    `${routePath}: canonical must be ${expectedCanonical}, found ${canonicalDeclarations[0].href ?? "missing href"}`,
  );
}

async function main(): Promise<void> {
  verifyRouteParserFixtures();
  const appSource = await readFile(APP_SOURCE_PATH, "utf8");
  const frontendStaticPaths = extractFrontendStaticPaths(appSource);
  assertNoDuplicates(STATIC_SITEMAP_PATHS, "static sitemap registry");

  const frontendSet = new Set(frontendStaticPaths);
  const registrySet = new Set(STATIC_SITEMAP_PATHS);
  const missingFromRegistry = frontendStaticPaths.filter(
    (routePath) => !registrySet.has(routePath),
  );
  const missingFromFrontend = STATIC_SITEMAP_PATHS.filter(
    (routePath) => !frontendSet.has(routePath),
  );
  assert.equal(
    missingFromRegistry.length,
    0,
    `indexable frontend route(s) missing from static sitemap registry: ${missingFromRegistry.join(", ")}`,
  );
  assert.equal(
    missingFromFrontend.length,
    0,
    `static sitemap path(s) missing from frontend router: ${missingFromFrontend.join(", ")}`,
  );

  const { response: sitemapResponse, body: sitemapIndexXml } = await fetchText(
    `${API_BASE_URL}/api/sitemap.xml`,
    "manual",
  );
  assert.equal(
    sitemapResponse.status,
    200,
    `sitemap endpoint returned HTTP ${sitemapResponse.status}`,
  );
  const sitemapContentType =
    sitemapResponse.headers.get("content-type") ?? "";
  assert.match(
    sitemapContentType,
    /^(?:application|text)\/xml\b/i,
    `sitemap endpoint returned non-XML content type: ${sitemapContentType || "missing"}`,
  );
  const sitemapChildren = parseSitemapIndexLocations(sitemapIndexXml);
  assert.equal(
    new Set(sitemapChildren).size,
    sitemapChildren.length,
    "sitemap index children must be unique",
  );
  const coreChildren = sitemapChildren.filter((location) => {
    try {
      return new URL(location).pathname === "/api/sitemaps/core.xml";
    } catch {
      return false;
    }
  });
  assert.equal(
    coreChildren.length,
    1,
    `sitemap index must contain exactly one core child, found ${coreChildren.length}`,
  );
  const canonicalCoreUrl = new URL(coreChildren[0]);
  const localCoreUrl = new URL(
    `${canonicalCoreUrl.pathname}${canonicalCoreUrl.search}`,
    API_BASE_URL,
  ).toString();
  const { response: coreResponse, body: coreXml } = await fetchText(
    localCoreUrl,
    "manual",
  );
  assert.equal(
    coreResponse.status,
    200,
    `core sitemap endpoint returned HTTP ${coreResponse.status}`,
  );
  assert.match(
    coreResponse.headers.get("content-type") ?? "",
    /^(?:application|text)\/xml\b/i,
    "core sitemap endpoint must return XML",
  );
  const sitemapLocations = parseSitemapLocations(coreXml);
  assertNoDuplicates(
    sitemapLocations.map((location) => {
      try {
        return new URL(location).pathname + new URL(location).search;
      } catch {
        return location;
      }
    }),
    "generated sitemap",
  );

  for (const routePath of STATIC_SITEMAP_PATHS) {
    const expectedLocation = `${HOST}${routePath}`;
    const count = sitemapLocations.filter(
      (location) => location === expectedLocation,
    ).length;
    assert.equal(
      count,
      1,
      `${routePath}: expected exactly one sitemap entry, found ${count}`,
    );
    await verifyIndexableStaticPage(routePath);
  }

  console.log(
    `Static sitemap routes verified: ${STATIC_SITEMAP_PATHS.length} literal frontend routes are unique, direct, self-canonical, and indexable.`,
  );
}

main().catch((error) => {
  console.error(
    `Static sitemap route verification failed: ${
      error instanceof Error ? error.message : "unknown error"
    }`,
  );
  process.exit(1);
});