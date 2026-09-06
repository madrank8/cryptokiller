import assert from "node:assert/strict";
import {
  buildInvestigationPaginationPages,
  buildSitemapHubLastmods,
  renderSitemapPage,
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

const fixturePages = buildInvestigationPaginationPages(45);

assert.deepEqual(
  fixturePages.map((page) => page.loc),
  ["/investigations?page=2", "/investigations?page=3"],
  "45 reviews should produce exactly the page 2 and page 3 sitemap entries",
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

console.log(
  "Sitemap lastmod policy verified: sliced review hubs and pages omit untrackable dates.",
);