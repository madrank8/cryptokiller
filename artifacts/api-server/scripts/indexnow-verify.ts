// IndexNow wiring verification — standalone, run on demand:
//
//   ./scripts/node_modules/.bin/tsx artifacts/api-server/scripts/indexnow-verify.ts
//   (or: npx tsx artifacts/api-server/scripts/indexnow-verify.ts)
//
// It is harmless: it builds canonical URLs via the SAME helpers the publish
// hooks and the sitemap use, then submits them live to IndexNow (which just
// asks Bing/Yandex/etc. to recrawl already-public pages). It does NOT touch the
// database. A 200/202 from the endpoint means the submission was accepted; the
// search engines then fetch https://cryptokiller.org/{INDEXNOW_KEY}.txt to
// confirm ownership before honoring the URLs.
//
// Slugs below are real published URLs (verified present in /api/sitemap.xml).
// Pair them with the live sitemap drift check to prove the pinged URLs are
// byte-identical to what is indexed.

import { reviewUrls, blogUrl } from "../src/canonical-urls";
import { submitUrls } from "../src/indexnow";

async function main(): Promise<void> {
  if (!process.env.INDEXNOW_KEY) {
    console.error("FAIL: INDEXNOW_KEY is not set in the environment.");
    process.exit(1);
  }

  // Master review + a real published es translation (senvix has both),
  // a master-only review, and a published blog post.
  const urls = [
    ...reviewUrls("senvix", [{ locale: "es", slug: "senvix" }]),
    ...reviewUrls("floventra"),
    blogUrl("pig-butchering-scam"),
  ];

  console.log("Canonical URLs built by the shared helpers:");
  for (const u of urls) console.log("  " + u);
  console.log("");

  const status = await submitUrls(urls);
  console.log("IndexNow endpoint HTTP status:", status);

  if (status === 200 || status === 202) {
    console.log("PASS: IndexNow accepted the submission.");
    process.exit(0);
  }

  console.error("FAIL: IndexNow did not accept the submission (expected 200/202).");
  process.exit(1);
}

main().catch((err) => {
  console.error("FAIL: verification threw:", err);
  process.exit(1);
});
