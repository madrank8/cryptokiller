// Secret-safe live IndexNow health check. This never prints the key or its
// derived ownership URL. It verifies ownership first, then submits known public
// canonical URLs and their changed collection hubs.

import {
  BLOG_HUB,
  HOST,
  INVESTIGATIONS_HUB,
  blogUrl,
  reviewUrls,
} from "../src/canonical-urls";
import {
  getIndexNowKey,
  submitUrls,
} from "../src/indexnow";

async function main(): Promise<void> {
  const key = getIndexNowKey();
  if (!key) {
    console.error(
      "FAIL: INDEXNOW_KEY is missing or invalid in the current environment.",
    );
    process.exit(1);
  }

  const ownershipBase = (
    process.env.INDEXNOW_VERIFY_BASE_URL ?? HOST
  ).replace(/\/+$/, "");
  const ownershipResponse = await fetch(
    `${ownershipBase}/${encodeURIComponent(key)}.txt`,
    {
      headers: { "cache-control": "no-cache" },
      signal: AbortSignal.timeout(10_000),
    },
  );
  const ownershipBody = await ownershipResponse.text();
  const contentTypeOk =
    ownershipResponse.headers.get("content-type")?.startsWith("text/plain") ??
    false;
  const bodyMatches = ownershipBody === key;

  console.log(
    `Ownership file: status=${ownershipResponse.status} contentTypeOk=${contentTypeOk} bodyMatches=${bodyMatches}`,
  );
  if (!ownershipResponse.ok || !contentTypeOk || !bodyMatches) {
    console.error(
      "FAIL: configured IndexNow ownership response does not match the secret.",
    );
    process.exit(1);
  }

  const urls = [
    ...reviewUrls("senvix", [{ locale: "es", slug: "senvix" }]),
    INVESTIGATIONS_HUB,
    ...reviewUrls("floventra"),
    blogUrl("pig-butchering-scam"),
    BLOG_HUB,
  ];
  console.log(`Submitting ${urls.length} canonical content and hub URLs.`);

  const status = await submitUrls(urls);
  console.log(`IndexNow endpoint status=${status ?? "request-failed"}`);
  if (status !== 200 && status !== 202) {
    console.error(
      "FAIL: IndexNow did not accept the submission; check ownership availability and endpoint status.",
    );
    process.exit(1);
  }

  console.log("PASS: ownership and submission are both verifiable.");
}

main().catch(() => {
  console.error(
    "FAIL: IndexNow verification threw; credentials were intentionally omitted.",
  );
  process.exit(1);
});