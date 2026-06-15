// IndexNow submission module.
//
// Pings the IndexNow endpoint (Bing / Yandex / Seznam, and via Bing, ChatGPT
// Search) so freshly published or updated URLs get recrawled fast. The key is
// read from process.env.INDEXNOW_KEY and MUST match the key file hosted by the
// crypto-review server at https://cryptokiller.org/{key}.txt — IndexNow fetches
// that file to verify domain ownership; a mismatch makes it discard every URL.
//
// All callers should treat this as fire-and-forget (see pingIndexNow): it never
// throws into the request lifecycle and never blocks the publish response.

import { logger } from "./lib/logger";

const ENDPOINT = "https://api.indexnow.org/indexnow";
const HOST = "cryptokiller.org";

const log = logger.child({ module: "indexnow" });

/**
 * Submit URLs to IndexNow. Returns the endpoint HTTP status (200/202 = the
 * submission was accepted), or null if skipped (no key / nothing to submit) or
 * the request threw. Swallows all errors internally — safe to call without
 * try/catch.
 */
export async function submitUrls(urls: string[]): Promise<number | null> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    log.warn("INDEXNOW_KEY not set; skipping IndexNow submission");
    return null;
  }

  // Dedupe and only ever submit https URLs on our own host — IndexNow rejects
  // submissions containing URLs from a different host than `host`.
  const list = Array.from(new Set(urls)).filter((u) => {
    try {
      const parsed = new URL(u);
      return parsed.protocol === "https:" && parsed.host === HOST;
    } catch {
      return false;
    }
  });
  if (list.length === 0) return null;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key,
        keyLocation: `https://${HOST}/${key}.txt`,
        urlList: list,
      }),
    });

    if (res.ok || res.status === 202) {
      log.info({ count: list.length, status: res.status, urls: list }, "IndexNow submission accepted");
    } else {
      const body = await res.text().catch(() => "");
      log.warn({ count: list.length, status: res.status, body, urls: list }, "IndexNow submission rejected");
    }
    return res.status;
  } catch (err) {
    log.error({ err, urls: list }, "IndexNow submission failed (non-fatal)");
    return null;
  }
}

/**
 * Fire-and-forget wrapper. Never awaited, never blocks, never throws into the
 * request lifecycle even if IndexNow is down.
 */
export function pingIndexNow(urls: string[]): void {
  if (urls && urls.length) void submitUrls(urls);
}
