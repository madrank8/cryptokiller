import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CAPTURED_ADS_TITLE,
  CAPTURED_ADS_NOTE,
  capturedAdsSummary,
  lastRecordedUtc,
  weeklyCreativesSummary,
  WEEKLY_CREATIVES_NOTE,
} from "../src/lib/adEvidencePresentation";

assert.equal(CAPTURED_ADS_TITLE, "Captured ad examples");
assert.match(CAPTURED_ADS_NOTE, /Historical captures/);
assert.equal(lastRecordedUtc("2026-08-13T21:15:00Z"), "Last recorded: 2026-08-13 (UTC)");
assert.equal(lastRecordedUtc("2026-08-13T23:15:00-04:00"), "Last recorded: 2026-08-14 (UTC)");
for (const missing of [null, undefined, "", "not-a-date"]) {
  assert.equal(lastRecordedUtc(missing), "Last recorded: date unavailable");
}
assert.equal(capturedAdsSummary(1, 1), `1 captured ad example across 1 country. ${CAPTURED_ADS_NOTE}`);
assert.equal(capturedAdsSummary(4, 2), `4 captured ad examples across 2 countries. ${CAPTURED_ADS_NOTE}`);
assert.equal(capturedAdsSummary(2, 0), `2 captured ad examples. ${CAPTURED_ADS_NOTE}`);
assert.equal(weeklyCreativesSummary(0), "No new creatives recorded in the last 7 days.");
assert.equal(weeklyCreativesSummary(1), "1 new creative recorded in the last 7 days.");
for (const count of [9, 10, 29, 30, 1000]) {
  assert.equal(weeklyCreativesSummary(count), `${count} new creatives recorded in the last 7 days.`);
  assert.doesNotMatch(weeklyCreativesSummary(count), /surging|rising|stable|active/i);
}
assert.match(WEEKLY_CREATIVES_NOTE, /do not establish a trend or current campaign activity/);

const client = await readFile(new URL("../src/pages/ReviewPage.tsx", import.meta.url), "utf8");
const server = await readFile(new URL("../server/prerender.ts", import.meta.url), "utf8");
for (const source of [client, server]) {
  assert.match(source, /lastRecordedUtc\(ad\.lastSeenAt\)/);
  assert.match(source, /capturedAdsSummary\(/);
  assert.match(source, /CAPTURED_ADS_TITLE/);
  assert.match(source, /weeklyCreativesSummary\(/);
  assert.match(source, /WEEKLY_CREATIVES_NOTE/);
}
const grid = client.slice(client.indexOf("function RecentAdsGrid"), client.indexOf("// ─── AdEvidenceSection"));
assert.doesNotMatch(grid, /Ads scraped this week|last 7 days|relativeDaysAgo/);
assert.match(grid, /data-ad-evidence-id/);
assert.match(grid, /safeHttpUrl\(ad\.ctaUrl\)/);
const ssrGrid = server.slice(server.indexOf("const recentAdsHtml"), server.indexOf("// ── Fraudulent-ad evidence"));
assert.doesNotMatch(ssrGrid, /Ads scraped this week|last 7 days|daysAgoSsr/);
assert.match(ssrGrid, /data-ad-evidence-id/);
assert.match(ssrGrid, /safeHttpUrlSsr\(ad\.ctaUrl\)/);
const widget = client.slice(client.indexOf("function VelocityWidget"), client.indexOf("function CelebrityGallery"));
assert.doesNotMatch(widget, /Surging|Rising|Stable|animate-ping|campaign activity in/);
assert.equal((server.match(/\$\{weeklyAdCountHtml\}/g) ?? []).length, 2, "both SSR article paths show the neutral weekly count");
console.log("Evidence presentation: UTC dates, historical wording, source/ID preservation, count boundaries and SSR/CSR wiring passed.");