// Focused source-contract checks for the approved homepage presentation changes.
// Run: pnpm --filter @workspace/crypto-review exec tsx scripts/verify-homepage-presentation.ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [homeSource, prerenderSource] = await Promise.all([
  readFile(new URL("../src/pages/HomePage.tsx", import.meta.url), "utf8"),
  readFile(new URL("../server/prerender.ts", import.meta.url), "utf8"),
]);

function functionBlock(source: string, name: string, nextName: string): string {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start);
  assert.ok(start >= 0 && end > start, `missing ${name} function boundary`);
  return source.slice(start, end);
}

const card = functionBlock(
  homeSource,
  "FeaturedInvestigationCard",
  "FeaturedInvestigations",
);
const featured = functionBlock(
  homeSource,
  "FeaturedInvestigations",
  "LatestReviews",
);
const latest = functionBlock(homeSource, "LatestReviews", "HowItWorks");
const ssrHome = functionBlock(prerenderSource, "renderHome", "renderInvestigationsList");

assert.match(featured, />Featured Investigations<\/h2>/);
assert.doesNotMatch(homeSource, /Trending Scams/);
assert.match(
  card,
  /<Badge className="bg-slate-800 text-slate-300 border border-slate-700[^"]*">\s*Investigation\s*<\/Badge>/,
  "featured cards must have a visually neutral Investigation badge",
);
assert.doesNotMatch(
  card,
  /\b(?:Confirmed Scam|Active|Stable|Rising|Surging|daysActive|trend|trendColor)\b/,
  "featured cards must not infer scam confirmation, activity, or trends",
);
assert.match(card, /\{threatScore\}/, "featured numerical scores must remain visible");
assert.match(card, /\{countriesTargeted\} countries/);
assert.match(card, /\{celebritiesAbused\} celebs/);
assert.match(card, /\{adCreatives\.toLocaleString\(\)\} ads/);
assert.match(card, /href=\{`\/review\/\$\{slug\}`\}/);
assert.match(featured, /\.sort\(\(a, b\) => b\.threatScore - a\.threatScore\)/);
assert.match(featured, /\.slice\(0, 8\)/, "featured selection must remain unchanged");
assert.match(featured, /href="\/investigations"/);
assert.match(homeSource, /<FeaturedInvestigations reviews=\{reviews\} isLoading=\{isLoading\} \/>/);
assert.match(latest, /\{r\.verdict\}/, "stored latest-review findings must remain intact");

assert.match(
  ssrHome,
  /substituteListRowText\(r\.verdict, r\) \|\| "Investigation"/,
  "homepage SSR must preserve stored verdicts and use a neutral empty-verdict fallback",
);
assert.doesNotMatch(ssrHome, /"Confirmed scam"/);
assert.match(ssrHome, /Threat \$\{r\.threatScore\}\/100/);
assert.match(
  ssrHome,
  /\.limit\(HOMEPAGE_LATEST_REVIEW_LINKS\)/,
  "homepage SSR discovery links must remain unchanged",
);

assert.match(ssrHome, /Featured Investigations/);
assert.match(ssrHome, /Investigation · Threat \$\{r\.threatScore\}\/100/);
console.log("verify-homepage-presentation: all checks passed");