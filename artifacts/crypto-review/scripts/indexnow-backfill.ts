import { submitUrls } from "../server/indexnow";

const SITEMAP = process.env.SITEMAP_URL || "https://cryptokiller.org/api/sitemap.xml";

async function main() {
  const res = await fetch(SITEMAP);
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].trim());
  console.log(`[indexnow] parsed ${urls.length} urls from ${SITEMAP}`);
  console.log(JSON.stringify(await submitUrls(urls), null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
