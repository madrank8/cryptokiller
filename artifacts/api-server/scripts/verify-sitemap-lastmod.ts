import assert from "node:assert/strict";
import {
  SITEMAP_CACHE_CONTROL,
  SITEMAP_URL_LIMIT,
  buildInvestigationPaginationPages,
  buildSitemapHubLastmods,
  renderSitemapIndex,
  INVESTIGATIONS_ITEMS_PER_PAGE,
  renderSitemapPage,
  renderSitemapUrlSet,
  sitemapShardNumbers,
} from "../src/lib/sitemap-pages.ts";

const initialHubDates = buildSitemapHubLastmods({
  latestReviewDate: new Date("2026-06-10T12:00:00.000Z"),
  latestBlogDate: new Date("2026-05-01T12:00:00.000Z"),
});
const newerOutsideSliceReviewHubDates = buildSitemapHubLastmods({
  latestReviewDate: new Date("2026-09-01T12:00:00.000Z"),
  latestBlogDate: new Date("2026-05-01T12:00:00.000Z"),
});
const newerBlogHubDates = buildSitemapHubLastmods({
  latestReviewDate: new Date("2026-06-10T12:00:00.000Z"),
  latestBlogDate: new Date("2026-08-20T12:00:00.000Z"),
});

assert.equal(initialHubDates.homepageLastmod, undefined);
assert.equal(initialHubDates.investigationsLastmod, undefined);
assert.equal(
  newerOutsideSliceReviewHubDates.homepageLastmod,
  initialHubDates.homepageLastmod,
  "an updated review outside homepage selections must not change its lastmod",
);
assert.equal(
  newerOutsideSliceReviewHubDates.investigationsLastmod,
  initialHubDates.investigationsLastmod,
  "an updated review outside page 1 must not change the investigations lastmod",
);
assert.equal(initialHubDates.blogLastmod, "2026-05-01");
assert.equal(newerBlogHubDates.homepageLastmod, undefined);
assert.equal(newerBlogHubDates.investigationsLastmod, undefined);
assert.equal(
  newerBlogHubDates.blogLastmod,
  "2026-08-20",
  "a newer blog post must advance only the blog hub lastmod",
);

const fixtureReviewCount = INVESTIGATIONS_ITEMS_PER_PAGE * 2 + 5;
const fixturePages = buildInvestigationPaginationPages(fixtureReviewCount);

assert.deepEqual(
  fixturePages.map((page) => page.loc),
  ["/investigations?page=2", "/investigations?page=3"],
  `${fixtureReviewCount} reviews should produce exactly the page 2 and page 3 sitemap entries`,
);
assert.ok(
  fixturePages.every((page) => page.lastmod === undefined),
  "paginated investigation entries must not inherit a hub-wide lastmod",
);

const fixtureXml = fixturePages
  .map((page) => renderSitemapPage("https://cryptokiller.org", page))
  .join("");

assert.doesNotMatch(
  fixtureXml,
  /<lastmod>/,
  "serialized paginated investigation entries must omit lastmod",
);
assert.match(fixtureXml, /<loc>https:\/\/cryptokiller\.org\/investigations\?page=2<\/loc>/);
assert.match(fixtureXml, /<loc>https:\/\/cryptokiller\.org\/investigations\?page=3<\/loc>/);

const boundaryCases = [
  { itemCount: 0, includeEmpty: true, expected: [1] },
  { itemCount: 0, includeEmpty: false, expected: [] },
  { itemCount: 5_000, includeEmpty: true, expected: [1] },
  { itemCount: 5_001, includeEmpty: true, expected: [1, 2] },
  { itemCount: 10_001, includeEmpty: true, expected: [1, 2, 3] },
] as const;
for (const fixture of boundaryCases) {
  assert.deepEqual(
    sitemapShardNumbers(fixture.itemCount, fixture.includeEmpty),
    fixture.expected,
    `${fixture.itemCount} records must produce deterministic 5,000-URL shard boundaries`,
  );
}

const syntheticEntries = Array.from({ length: 10_001 }, (_, index) => ({
  loc: `https://cryptokiller.org/review/synthetic-${index + 1}`,
  lastmod: "2026-01-01",
}));
const syntheticShards = sitemapShardNumbers(syntheticEntries.length).map(
  (shardNumber) =>
    syntheticEntries.slice(
      (shardNumber - 1) * SITEMAP_URL_LIMIT,
      shardNumber * SITEMAP_URL_LIMIT,
    ),
);
assert.deepEqual(
  syntheticShards.map((entries) => entries.length),
  [5_000, 5_000, 1],
);
const renderedShards = syntheticShards.map(renderSitemapUrlSet);
assert.ok(
  renderedShards.every(
    (xml) => Array.from(xml.matchAll(/<url>/g)).length <= SITEMAP_URL_LIMIT,
  ),
  "every rendered child sitemap must stay at or below the 5,000 URL contract",
);
assert.deepEqual(
  renderedShards.flatMap((xml) =>
    Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1]),
  ),
  syntheticEntries.map((entry) => entry.loc),
  "sharding must preserve every canonical URL exactly once and in stable order",
);
const syntheticIndexEntries = syntheticShards.map((_, index) => ({
  loc: `https://cryptokiller.org/api/sitemaps/reviews/${index + 1}.xml`,
}));
assert.equal(
  renderSitemapIndex(syntheticIndexEntries),
  renderSitemapIndex(syntheticIndexEntries),
  "sitemap index rendering must be deterministic",
);
assert.equal(
  Array.from(
    renderSitemapIndex(syntheticIndexEntries).matchAll(/<sitemap>/g),
  ).length,
  3,
);
assert.match(SITEMAP_CACHE_CONTROL, /(?:^|,\s*)s-maxage=3600(?:,|$)/);
assert.doesNotMatch(SITEMAP_CACHE_CONTROL, /immutable/i);

console.log(
  "Sitemap policy verified: truthful dates, deterministic 5,000-URL shards, complete boundary coverage, and one-hour shared caching.",
);