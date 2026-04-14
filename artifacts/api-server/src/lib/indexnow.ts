import { logger } from "./logger";

const INDEXNOW_KEY = "ed97b40b36394fbbbdcf7e083192b4f4";
const SITE_HOST = "cryptokiller.org";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

const log = logger.child({ module: "indexnow" });

export async function submitToIndexNow(urls: string[]): Promise<void> {
  if (!urls.length) return;

  const absoluteUrls = urls.map((u) =>
    u.startsWith("http") ? u : `https://${SITE_HOST}${u.startsWith("/") ? "" : "/"}${u}`
  );

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: SITE_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`,
        urlList: absoluteUrls,
      }),
    });

    if (response.ok || response.status === 202) {
      log.info({ urls: absoluteUrls, status: response.status }, "IndexNow submission accepted");
    } else {
      const body = await response.text().catch(() => "");
      log.warn(
        { urls: absoluteUrls, status: response.status, body },
        "IndexNow submission rejected"
      );
    }
  } catch (err) {
    log.error({ err, urls: absoluteUrls }, "IndexNow submission failed");
  }
}
