const ENDPOINT = "https://api.indexnow.org/indexnow";
const HOST = "cryptokiller.org";

export function getIndexNowKey(): string | null {
  return process.env.INDEXNOW_KEY || null;
}

export async function submitUrls(urls: string[]) {
  const key = getIndexNowKey();
  if (!key) {
    console.warn("[indexnow] INDEXNOW_KEY not set; skipping");
    return [];
  }
  const keyLocation = `https://${HOST}/${key}.txt`;
  const clean = Array.from(new Set(urls.filter((u) => {
    try { const x = new URL(u); return x.protocol === "https:" && x.host === HOST; }
    catch { return false; }
  })));
  const results: { status: number; ok: boolean; count: number; body: string }[] = [];
  for (let i = 0; i < clean.length; i += 10000) {
    const batch = clean.slice(i, i + 10000);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key, keyLocation, urlList: batch }),
    });
    const body = await res.text().catch(() => "");
    results.push({ status: res.status, ok: res.ok, count: batch.length, body });
    console.log(`[indexnow] ${batch.length} urls -> ${res.status} ${res.statusText}`);
  }
  return results;
}
