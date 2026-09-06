import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { asc, desc, eq } from "drizzle-orm";
import {
  db,
  pool,
  blogPostsTable,
  reviewsTable,
} from "@workspace/db";
import {
  HOMEPAGE_LATEST_REVIEW_LINKS,
  INVESTIGATIONS_ITEMS_PER_PAGE,
  RELATED_INVESTIGATIONS_LIMIT,
} from "@workspace/site-content";
import {
  renderRelatedInvestigationsHtml,
  type RelatedInvestigationLink,
} from "../server/discovery-links.js";
import { renderPage } from "../server/prerender.js";

function uniqueMatches(html: string, pattern: RegExp): string[] {
  return [
    ...new Set(
      [...html.matchAll(pattern)]
        .map((match) => match[1]?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

function reviewSlugs(html: string): string[] {
  return uniqueMatches(html, /href=["']\/review\/([^"'?#/]+)["']/gi);
}

function blogSlugs(html: string): string[] {
  return uniqueMatches(html, /href=["']\/blog\/([^"'?#/]+)["']/gi);
}

function relatedSection(html: string): string {
  return html.match(
    /<section[^>]*data-related-investigations[^>]*>[\s\S]*?<\/section>/i,
  )?.[0] ?? "";
}

function dateMs(value: Date | null): number {
  return value?.getTime() ?? 0;
}

function assertRelatedHtmlBoundary(): void {
  const makeRow = (index: number): RelatedInvestigationLink => ({
    slug: `peer-${index}`,
    platformName: `Peer ${index}`,
    threatScore: 100 - index,
    verdict: `Evidence summary for peer ${index}.`,
  });
  const many = Array.from(
    { length: RELATED_INVESTIGATIONS_LIMIT + 4 },
    (_, index) => makeRow(index + 1),
  );

  const capped = renderRelatedInvestigationsHtml("current-review", [
    { ...makeRow(99), slug: "current-review" },
    many[0],
    many[0],
    ...many,
  ]);
  assert.equal(
    reviewSlugs(capped).length,
    RELATED_INVESTIGATIONS_LIMIT,
    "related review HTML must enforce the shared link cap",
  );
  assert.ok(
    !reviewSlugs(capped).includes("current-review"),
    "related review HTML must exclude self-links",
  );

  const lowMatch = renderRelatedInvestigationsHtml(
    "current-review",
    [
      {
        ...many[0],
        platformName: '<Unsafe "brand">',
        verdict: "A & B < C",
      },
      ...many.slice(1, 3),
    ],
  );
  assert.equal(
    reviewSlugs(lowMatch).length,
    3,
    "related review HTML must render every available peer below the cap",
  );
  assert.doesNotMatch(
    lowMatch,
    /<Unsafe|A & B < C/,
    "related review HTML must not emit unescaped database text",
  );
  assert.match(
    lowMatch,
    /&lt;Unsafe &quot;brand&quot;&gt;|A &amp; B &lt; C/,
    "related review HTML must escape platform and verdict text",
  );
  assert.equal(
    renderRelatedInvestigationsHtml("current-review", []),
    "",
    "related review HTML must disappear safely when no peers exist",
  );
}

async function main(): Promise<void> {
  assert.equal(
    HOMEPAGE_LATEST_REVIEW_LINKS,
    20,
    "homepage discovery link target changed unexpectedly",
  );
  assert.equal(
    INVESTIGATIONS_ITEMS_PER_PAGE,
    50,
    "investigations page size changed unexpectedly",
  );
  assert.ok(
    RELATED_INVESTIGATIONS_LIMIT >= 6 &&
      RELATED_INVESTIGATIONS_LIMIT <= 10,
    "related investigation count must stay within the approved 6–10 range",
  );
  assertRelatedHtmlBoundary();

  const [publishedReviews, publishedBlogs] = await Promise.all([
    db
      .select({
        slug: reviewsTable.slug,
        threatScore: reviewsTable.threatScore,
        investigationDate: reviewsTable.investigationDate,
        updatedAt: reviewsTable.updatedAt,
      })
      .from(reviewsTable)
      .where(eq(reviewsTable.status, "published")),
    db
      .select({
        slug: blogPostsTable.slug,
        updatedAt: blogPostsTable.updatedAt,
      })
      .from(blogPostsTable)
      .where(eq(blogPostsTable.status, "published"))
      .orderBy(desc(blogPostsTable.updatedAt), asc(blogPostsTable.slug)),
  ]);

  const newestReviewSlugs = [...publishedReviews]
    .sort(
      (a, b) =>
        dateMs(b.investigationDate) - dateMs(a.investigationDate) ||
        a.slug.localeCompare(b.slug),
    )
    .slice(0, HOMEPAGE_LATEST_REVIEW_LINKS)
    .map((review) => review.slug);
  const threatSortedSlugs = [...publishedReviews]
    .sort(
      (a, b) =>
        b.threatScore - a.threatScore ||
        dateMs(a.investigationDate) - dateMs(b.investigationDate) ||
        a.slug.localeCompare(b.slug),
    )
    .map((review) => review.slug);

  const home = await renderPage("/");
  assert.equal(home.status, 200);
  assert.deepEqual(
    reviewSlugs(home.bodyHtml),
    newestReviewSlugs,
    "homepage raw HTML must expose the newest published review slice",
  );

  const investigations = await renderPage("/investigations");
  assert.equal(investigations.status, 200);
  assert.deepEqual(
    reviewSlugs(investigations.bodyHtml),
    threatSortedSlugs.slice(0, INVESTIGATIONS_ITEMS_PER_PAGE),
    "investigations raw HTML must expose the first score-sorted page",
  );

  if (publishedReviews.length > INVESTIGATIONS_ITEMS_PER_PAGE) {
    const pageTwo = await renderPage("/investigations?page=2");
    const pageTwoSlugs = reviewSlugs(pageTwo.bodyHtml);
    const expectedPageTwo = threatSortedSlugs.slice(
      INVESTIGATIONS_ITEMS_PER_PAGE,
      INVESTIGATIONS_ITEMS_PER_PAGE * 2,
    );
    assert.equal(pageTwo.status, 200);
    assert.deepEqual(
      pageTwoSlugs,
      expectedPageTwo,
      "investigations page 2 must expose the next distinct review slice",
    );
    assert.equal(
      pageTwoSlugs.some((slug) =>
        threatSortedSlugs
          .slice(0, INVESTIGATIONS_ITEMS_PER_PAGE)
          .includes(slug),
      ),
      false,
      "investigations pages must not overlap",
    );
    assert.match(
      pageTwo.bodyHtml,
      /<a(?=[^>]*\brel=["']prev["'])(?=[^>]*\bhref=["']https:\/\/cryptokiller\.org\/investigations["'])[^>]*>/i,
      "investigations page 2 must have a real previous-page anchor",
    );
  }

  const blog = await renderPage("/blog");
  assert.equal(blog.status, 200);
  assert.deepEqual(
    blogSlugs(blog.bodyHtml),
    publishedBlogs.map((post) => post.slug),
    "blog raw HTML must expose every published post",
  );

  if (threatSortedSlugs.length > 0) {
    const currentSlug = threatSortedSlugs[0];
    const review = await renderPage(`/review/${currentSlug}`);
    assert.equal(review.status, 200);
    const relatedSlugs = reviewSlugs(relatedSection(review.bodyHtml));
    const expectedRelatedSlugs = threatSortedSlugs
      .filter((slug) => slug !== currentSlug)
      .slice(0, RELATED_INVESTIGATIONS_LIMIT);
    assert.equal(
      relatedSlugs.length,
      Math.min(
        RELATED_INVESTIGATIONS_LIMIT,
        Math.max(0, threatSortedSlugs.length - 1),
      ),
      "review raw HTML must expose every available related peer up to the shared cap",
    );
    assert.ok(
      !relatedSlugs.includes(currentSlug),
      "review raw HTML must not link to itself as related",
    );
    assert.deepEqual(
      relatedSlugs,
      expectedRelatedSlugs,
      "review raw HTML must preserve the related endpoint's peer ordering",
    );
    assert.doesNotMatch(
      relatedSection(review.bodyHtml),
      /\{\{stat:/,
      "review raw HTML must not expose unresolved related-row stat tokens",
    );
  }

  const prerenderSource = await readFile(
    new URL("../server/prerender.ts", import.meta.url),
    "utf8",
  );
  assert.equal(
    [...prerenderSource.matchAll(/\$\{relatedInvestigationsHtml\}/g)].length,
    2,
    "related investigation HTML must remain wired into both review SSR branches",
  );

  console.log(
    `Discovery SSR verified: ${newestReviewSlugs.length} home links, ` +
      `${Math.min(publishedReviews.length, INVESTIGATIONS_ITEMS_PER_PAGE)} investigation links, ` +
      `${publishedBlogs.length} blog links.`,
  );
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });