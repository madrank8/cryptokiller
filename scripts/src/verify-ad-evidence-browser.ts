/// <reference lib="dom" />

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium, type BrowserContext, type Page } from "playwright-core";

type TranslationRef = {
  locale: string;
  slug: string;
};

type ReviewSummary = {
  slug: string;
};

type RelatedReview = {
  slug: string;
};

type ReviewDetail = {
  slug: string;
  recentAds?: unknown[];
  translations?: TranslationRef[];
};

type EvidenceIds = {
  cards: string[];
  reviewHasPart: string[];
  matchingReviewNodes: number;
  visibleSections: number;
  hiddenCards: number;
};

const WEB_BASE_URL = (
  process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:45871"
).replace(/\/+$/, "");
const API_BASE_URL = (
  process.env.VERIFY_API_BASE_URL ?? "http://127.0.0.1:45872"
).replace(/\/+$/, "");

function localeUrlSegment(locale: string): string {
  return locale.toLowerCase();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.status, 200, `expected HTTP 200 from ${url}`);
  return (await response.json()) as T;
}

async function discoverFixture(): Promise<{
  master: ReviewDetail;
  translation: TranslationRef;
  related: ReviewDetail;
}> {
  const summaries = await fetchJson<ReviewSummary[]>(
    `${API_BASE_URL}/api/reviews`,
  );
  const details = new Map<string, ReviewDetail>();
  const detailFor = async (slug: string): Promise<ReviewDetail> => {
    const cached = details.get(slug);
    if (cached) return cached;
    const detail = await fetchJson<ReviewDetail>(
      `${API_BASE_URL}/api/reviews/${encodeURIComponent(slug)}`,
    );
    details.set(slug, detail);
    return detail;
  };

  for (const summary of summaries) {
    const detail = await detailFor(summary.slug);
    const translation = detail.translations?.find(
      (candidate) =>
        typeof candidate.locale === "string" &&
        typeof candidate.slug === "string",
    );
    if ((detail.recentAds?.length ?? 0) === 0 || !translation) continue;

    const relatedCandidates = await fetchJson<RelatedReview[]>(
      `${API_BASE_URL}/api/reviews/${encodeURIComponent(detail.slug)}/related`,
    );
    for (const candidate of relatedCandidates) {
      const related = await detailFor(candidate.slug);
      if ((related.recentAds?.length ?? 0) > 0) {
        return { master: detail, translation, related };
      }
    }
  }
  throw new Error(
    "No complete browser fixture: need a published review with recent ads, a published translation, and a related review with recent ads",
  );
}

async function installApiRouting(context: BrowserContext): Promise<void> {
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const source = new URL(request.url());
    const upstreamUrl = `${API_BASE_URL}${source.pathname}${source.search}`;
    const upstream = await fetch(upstreamUrl, {
      method: request.method(),
      headers: {
        accept: request.headers().accept ?? "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });
    await route.fulfill({
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ??
          "application/json; charset=utf-8",
      },
      body: Buffer.from(await upstream.arrayBuffer()),
    });
  });
  // Production boot pings Google's sitemap endpoint once per session. It is
  // unrelated to this same-origin DOM contract and must not make CI network-
  // dependent.
  await context.route("https://www.google.com/ping?**", (route) =>
    route.abort("blockedbyclient"),
  );
}

async function readEvidenceIds(
  page: Page,
  phase: "ssr" | "csr",
  expectedCanonical: string,
): Promise<EvidenceIds> {
  return page.evaluate(({ phase, expectedReviewId }) => {
    const visibleSections = Array.from(
      document.querySelectorAll<HTMLElement>(
        'section[aria-labelledby="recent-ads-heading"]',
      ),
    ).filter((element) => {
      const style = window.getComputedStyle(element);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        element.getClientRects().length > 0
      );
    });
    const cardElements = visibleSections.flatMap((section) =>
      Array.from(
        section.querySelectorAll<HTMLElement>("[data-ad-evidence-id]"),
      ),
    );
    const cards = cardElements
      .map((element) => element.dataset.adEvidenceId ?? "")
      .filter(Boolean);

    const reviewHasPart: string[] = [];
    let matchingReviewNodes = 0;
    const scriptSelector =
      phase === "ssr"
        ? 'script[type="application/ld+json"][data-ssr-jsonld]'
        : 'script[type="application/ld+json"][data-page-jsonld]';
    for (const script of Array.from(
      document.querySelectorAll<HTMLScriptElement>(scriptSelector),
    )) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(script.textContent ?? "null");
      } catch {
        continue;
      }
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      for (const root of roots) {
        if (!root || typeof root !== "object") continue;
        const record = root as Record<string, unknown>;
        const nodes = Array.isArray(record["@graph"])
          ? record["@graph"]
          : [record];
        for (const node of nodes) {
          if (!node || typeof node !== "object") continue;
          const typedNode = node as Record<string, unknown>;
          const types = Array.isArray(typedNode["@type"])
            ? typedNode["@type"]
            : [typedNode["@type"]];
          if (!types.includes("Review")) continue;
          if (typedNode["@id"] !== expectedReviewId) continue;
          matchingReviewNodes += 1;
          const parts = Array.isArray(typedNode.hasPart)
            ? typedNode.hasPart
            : typedNode.hasPart
              ? [typedNode.hasPart]
              : [];
          for (const part of parts) {
            if (!part || typeof part !== "object") continue;
            const id = (part as Record<string, unknown>)["@id"];
            if (typeof id !== "string") continue;
            const marker = id.indexOf("#ad-evidence-");
            if (marker >= 0) reviewHasPart.push(id.slice(marker));
          }
        }
      }
    }

    return {
      cards: cards.sort(),
      reviewHasPart: reviewHasPart.sort(),
      matchingReviewNodes,
      visibleSections: visibleSections.length,
      hiddenCards: cardElements.filter((element) => {
        const style = window.getComputedStyle(element);
        return (
          style.display === "none" ||
          style.visibility === "hidden" ||
          element.getClientRects().length === 0
        );
      }).length,
    };
  }, { phase, expectedReviewId: `${expectedCanonical}#review` });
}

async function assertLockstep(
  page: Page,
  options: {
    label: string;
    phase: "ssr" | "csr";
    expectedPath: string;
  },
): Promise<void> {
  const expectedCanonical = `https://cryptokiller.org${options.expectedPath}`;
  await page.waitForFunction(
    ({ phase, expectedPath, expectedReviewId }) => {
      if (window.location.pathname !== expectedPath) return false;
      if (
        phase === "csr" &&
        document.querySelector("script[data-ssr-jsonld]")
      ) {
        return false;
      }
      const scriptSelector =
        phase === "ssr"
          ? 'script[type="application/ld+json"][data-ssr-jsonld]'
          : 'script[type="application/ld+json"][data-page-jsonld]';
      const routeReviewExists = Array.from(
        document.querySelectorAll<HTMLScriptElement>(scriptSelector),
      ).some((script) => {
        try {
          const parsed: unknown = JSON.parse(script.textContent ?? "null");
          const roots = Array.isArray(parsed) ? parsed : [parsed];
          return roots.some((root) => {
            if (!root || typeof root !== "object") return false;
            const record = root as Record<string, unknown>;
            const nodes = Array.isArray(record["@graph"])
              ? record["@graph"]
              : [record];
            return nodes.some(
              (node) =>
                Boolean(node) &&
                typeof node === "object" &&
                (node as Record<string, unknown>)["@id"] ===
                  expectedReviewId,
            );
          });
        } catch {
          return false;
        }
      });
      return (
        routeReviewExists &&
        document.querySelectorAll(
          'section[aria-labelledby="recent-ads-heading"] [data-ad-evidence-id]',
        ).length > 0
      );
    },
    {
      phase: options.phase,
      expectedPath: options.expectedPath,
      expectedReviewId: `${expectedCanonical}#review`,
    },
    { timeout: 20_000 },
  );
  const evidence = await readEvidenceIds(
    page,
    options.phase,
    expectedCanonical,
  );
  assert.equal(
    evidence.visibleSections,
    1,
    `${options.label}: expected one visible recent-ads section`,
  );
  assert.equal(
    evidence.hiddenCards,
    0,
    `${options.label}: a scoped ad card is not visible`,
  );
  assert.equal(
    evidence.matchingReviewNodes,
    1,
    `${options.label}: expected one route-specific Review JSON-LD node`,
  );
  assert.ok(
    evidence.cards.length > 0,
    `${options.label}: no visible ad cards found`,
  );
  assert.equal(
    new Set(evidence.cards).size,
    evidence.cards.length,
    `${options.label}: duplicate visible card IDs found`,
  );
  assert.equal(
    new Set(evidence.reviewHasPart).size,
    evidence.reviewHasPart.length,
    `${options.label}: duplicate Review.hasPart IDs found`,
  );
  assert.deepEqual(
    evidence.cards,
    evidence.reviewHasPart,
    `${options.label}: visible card IDs differ from Review.hasPart IDs`,
  );
  console.log(
    `[verify-ad-evidence-browser] PASS ${options.label}: ${evidence.cards.length} creative IDs`,
  );
}

async function main(): Promise<void> {
  const { master, translation, related } = await discoverFixture();
  const masterPath = `/review/${encodeURIComponent(master.slug)}`;
  const relatedPath = `/review/${encodeURIComponent(related.slug)}`;
  const translationPath =
    `/${localeUrlSegment(translation.locale)}/review/` +
    encodeURIComponent(translation.slug);
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
    execFileSync("which", ["chromium"], { encoding: "utf8" }).trim();
  assert.ok(executablePath, "Chromium executable was not found");

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    // Prove first-byte SSR lockstep with JavaScript disabled.
    const ssrContext = await browser.newContext({ javaScriptEnabled: false });
    const ssrPage = await ssrContext.newPage();
    await ssrPage.goto(`${WEB_BASE_URL}${masterPath}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await assertLockstep(ssrPage, {
      label: "initial SSR master",
      phase: "ssr",
      expectedPath: masterPath,
    });
    await ssrContext.close();

    const context = await browser.newContext();
    await installApiRouting(context);
    const page = await context.newPage();
    let documentNavigations = 0;
    page.on("request", (request) => {
      if (
        request.isNavigationRequest() &&
        request.resourceType() === "document"
      ) {
        documentNavigations += 1;
      }
    });

    await page.goto(`${WEB_BASE_URL}${masterPath}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await assertLockstep(page, {
      label: "hydrated master",
      phase: "csr",
      expectedPath: masterPath,
    });
    const navigationsAfterInitialLoad = documentNavigations;

    const relatedLink = page
      .locator(`a[href="${relatedPath}"]`)
      .first();
    await relatedLink.waitFor({ state: "visible", timeout: 20_000 });
    await relatedLink.click();
    await page.waitForURL(
      (url) => url.pathname === relatedPath,
      { timeout: 20_000 },
    );
    await assertLockstep(page, {
      label: "SPA related review",
      phase: "csr",
      expectedPath: relatedPath,
    });

    await page.goBack();
    await page.waitForURL((url) => url.pathname === masterPath, {
      timeout: 20_000,
    });
    await assertLockstep(page, {
      label: "SPA return to master",
      phase: "csr",
      expectedPath: masterPath,
    });
    assert.equal(
      documentNavigations,
      navigationsAfterInitialLoad,
      "away/back journey performed a document reload instead of SPA navigation",
    );

    await page.goto(`${WEB_BASE_URL}${translationPath}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await assertLockstep(page, {
      label: `hydrated locale ${translation.locale}`,
      phase: "csr",
      expectedPath: translationPath,
    });
    await context.close();
  } finally {
    await browser.close();
  }

  console.log(
    "[verify-ad-evidence-browser] PASS initial SSR, hydration, SPA away/back, and locale route",
  );
}

main().catch((error) => {
  console.error(
    `[verify-ad-evidence-browser] FAIL: ${
      error instanceof Error ? error.message : "unknown browser-test error"
    }`,
  );
  process.exit(1);
});