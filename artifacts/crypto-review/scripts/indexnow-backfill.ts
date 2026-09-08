import { submitUrls } from "../server/indexnow";

const SITEMAP = process.env.SITEMAP_URL || "https://cryptokiller.org/api/sitemap.xml";

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractLocs(xml: string, element: "sitemap" | "url"): string[] {
  return Array.from(
    xml.matchAll(
      new RegExp(
        `<${element}\\b[^>]*>[\\s\\S]*?<loc>([^<]+)<\\/loc>[\\s\\S]*?<\\/${element}>`,
        "gi",
      ),
    ),
    (match) => decodeXml(match[1].trim()),
  );
}

async function collectSitemapUrls(rootUrl: string): Promise<string[]> {
  const root = new URL(rootUrl);
  const pending = [rootUrl];
  const visited = new Set<string>();
  const urls: string[] = [];
  while (pending.length > 0) {
    const requested = pending.shift()!;
    const parsed = new URL(requested);
    const visitKey = `${parsed.pathname}${parsed.search}`;
    if (visited.has(visitKey)) {
      throw new Error(`sitemap cycle or duplicate child: ${visitKey}`);
    }
    visited.add(visitKey);
    const localUrl = new URL(`${parsed.pathname}${parsed.search}`, root.origin);
    const response = await fetch(localUrl);
    if (!response.ok) {
      throw new Error(`sitemap fetch failed: ${response.status}`);
    }
    const xml = await response.text();
    if (/<sitemapindex\b/i.test(xml)) {
      const children = extractLocs(xml, "sitemap");
      if (children.length === 0) throw new Error("sitemap index is empty");
      pending.push(...children);
      continue;
    }
    if (!/<urlset\b/i.test(xml)) {
      throw new Error(`unexpected sitemap root at ${visitKey}`);
    }
    urls.push(...extractLocs(xml, "url"));
  }
  if (new Set(urls).size !== urls.length) {
    throw new Error("flattened sitemap contains duplicate canonical URLs");
  }
  return urls;
}

async function main() {
  const urls = await collectSitemapUrls(SITEMAP);
  console.log(`[indexnow] parsed ${urls.length} canonical sitemap URLs`);
  console.log(JSON.stringify(await submitUrls(urls), null, 2));
}
main().catch(() => {
  console.error(
    "[indexnow-backfill] failed; request details and credentials were intentionally omitted",
  );
  process.exit(1);
});
