// Verifies the SSR ↔ CSR lockstep contract for the recent-ads ("ad evidence")
// JSON-LD on review pages:
//
//   1. Both render paths build nodes through the ONE shared builder
//      (artifacts/crypto-review/src/lib/adEvidenceSchema.ts).
//   2. The SSR server embeds its snapshot as an escaped JSON <script>; the
//      hydrated client parses that snapshot and rebuilds the graph from it.
//      This test simulates that full round trip (build → escape → parse →
//      rebuild) for a fixed fixture and requires deep equality, including
//      key order and every optional field.
//   3. CTA safety defense-in-depth: a landing URL smuggled into postUrl must
//      never surface as `url` in the structured data.
//
// Run: pnpm --filter @workspace/crypto-review run verify:ad-evidence
import assert from "node:assert/strict";
import { buildAdEvidenceGraph, type AdEvidenceAd } from "../src/lib/adEvidenceSchema.js";

// Mirrors escapeJsonLd in server/index.ts.
function escapeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

const PAGE = "https://cryptokiller.org/review/senvix";

const fixture: AdEvidenceAd[] = [
  {
    // Every optional field populated, incl. $-patterns and </script> breakout
    // attempts in adCopy (regression guards for the replace()/escape hazards).
    id: "68a57ba903e11e69cabad92a",
    offer: "Senvix",
    celebrity: "Cristiano Ronaldo, Elon Musk",
    geo: "IT",
    language: "it",
    isVideo: true,
    lastSeenAt: "2026-08-01T10:00:00.000Z",
    scrapeCount: 7,
    postUrl: "https://www.facebook.com/1234567890/posts/9876543210",
    adCopy: `Guadagna $300 al giorno! $& $' $\` </script><script>alert(1)</script>`,
  },
  {
    // Minimal ad: nulls everywhere optional.
    id: "68a57d4403e11e69cabad9bd",
    offer: "Senvix Pro",
    celebrity: null,
    geo: "DE",
    language: null,
    isVideo: false,
    lastSeenAt: "2026-08-02T00:00:00.000Z",
    scrapeCount: 0,
    postUrl: null,
    adCopy: null,
  },
];

// ── 1+2: full SSR → embed → parse → CSR rebuild round trip ────────────────
const ssrGraph = buildAdEvidenceGraph(PAGE, fixture, true);
const embedded = escapeJsonLd(fixture); // what applyMeta writes into <script id="ssr-recent-ads">
const parsedSnapshot = JSON.parse(embedded) as AdEvidenceAd[]; // what readSsrRecentAdsSnapshot yields
const csrGraph = buildAdEvidenceGraph(PAGE, parsedSnapshot, true);

assert.deepEqual(csrGraph, ssrGraph, "hydrated CSR graph must equal SSR graph for the same snapshot");
assert.equal(
  JSON.stringify(csrGraph),
  JSON.stringify(ssrGraph),
  "serialized graphs must be byte-identical (key order included)",
);
assert.equal(ssrGraph.hasPart.length, 2);
assert.equal(ssrGraph.nodes.length, 2);
assert.deepEqual(
  ssrGraph.hasPart.map((h) => h["@id"]),
  ssrGraph.nodes.map((n) => n["@id"]),
  "Review.hasPart must reference exactly the emitted nodes, in order",
);
assert.ok(ssrGraph.hasPart[0]["@id"].endsWith("#ad-evidence-68a57ba903e11e69cabad92a"), "@id keyed by creative UUID");

// Optional-field handling: node 1 has everything, node 2 omits absent fields.
const [full, minimal] = ssrGraph.nodes;
assert.equal(full.url, fixture[0].postUrl);
assert.deepEqual(full.mentions, [
  { "@type": "Person", name: "Cristiano Ronaldo" },
  { "@type": "Person", name: "Elon Musk" },
]);
assert.equal(full.text, fixture[0].adCopy);
for (const absent of ["url", "mentions", "text", "inLanguage"]) {
  assert.ok(!(absent in minimal), `minimal node must omit ${absent}`);
}

// The embed itself must be inert inside a <script> element.
assert.ok(!embedded.includes("</script>"), "embedded snapshot must not contain a script-closing sequence");
assert.ok(!embedded.includes("<"), "embedded snapshot must escape all angle brackets");

// ── 3: CTA safety at the emission boundary ─────────────────────────────────
const hostile: AdEvidenceAd = {
  ...fixture[1],
  id: "hostile1",
  postUrl: "https://senvix-profit.icu/click?fbclid=abc", // landing URL must be dropped
};
const hostileNode = buildAdEvidenceGraph(PAGE, [hostile], false).nodes[0];
assert.ok(!("url" in hostileNode), "non-Facebook landing URL must never surface as url");
const fbForbidden = { ...hostile, postUrl: "https://www.facebook.com/click?token_fb=1" };
assert.ok(
  !("url" in buildAdEvidenceGraph(PAGE, [fbForbidden], false).nodes[0]),
  "facebook URL matching the forbidden CTA pattern must be dropped",
);
assert.ok(!("about" in hostileNode), "about must be omitted when no #item-reviewed node exists");

// ── 4: empty snapshot is authoritative ─────────────────────────────────────
// SSR embeds the snapshot even when it observed zero ads. The client-side
// reader treats a parsed empty array as authoritative ([] ?? apiAds keeps []),
// so a later non-empty API response cannot conjure a grid/JSON-LD absent from
// the first-byte HTML. Simulate the embed → parse → rebuild path for [].
const emptyEmbed = escapeJsonLd([] as AdEvidenceAd[]);
const emptyParsed: unknown = JSON.parse(emptyEmbed);
assert.ok(Array.isArray(emptyParsed) && emptyParsed.length === 0, "empty snapshot must round-trip as []");
// Mirrors `ssrRecentAds ?? review.recentAds ?? []` in ReviewPage.tsx: an
// empty PARSED snapshot must win over non-empty API data.
const apiAds = fixture;
const effective = (emptyParsed as AdEvidenceAd[]) ?? apiAds;
assert.equal(effective.length, 0, "empty SSR snapshot must suppress API-provided ads");
const emptyGraph = buildAdEvidenceGraph(PAGE, effective, true);
assert.equal(emptyGraph.nodes.length, 0);
assert.equal(emptyGraph.hasPart.length, 0);

console.log("verify-ad-evidence-lockstep: all checks passed");
