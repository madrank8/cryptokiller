export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_HOST = "cryptokiller.org";
export const INDEXNOW_MAX_URLS_PER_REQUEST = 10_000;

export interface IndexNowOwnership {
  status: 200;
  path: string;
  body: string;
  contentType: "text/plain; charset=utf-8";
}

export interface IndexNowBatchResult {
  status: number;
  ok: boolean;
  count: number;
}

export interface IndexNowSubmitOptions {
  fetchImpl?: typeof fetch;
  keyProvider?: () => string | null | undefined;
}

export function normalizeIndexNowKey(
  value: string | null | undefined,
): string | null {
  const key = value?.trim() ?? "";
  return /^[A-Za-z0-9_-]{8,128}$/.test(key) ? key : null;
}

export function getIndexNowKey(): string | null {
  return normalizeIndexNowKey(process.env.INDEXNOW_KEY);
}

export function indexNowKeyLocation(key: string): string {
  return `https://${INDEXNOW_HOST}/${key}.txt`;
}

export function getIndexNowOwnership(
  key = getIndexNowKey(),
): IndexNowOwnership | null {
  const normalized = normalizeIndexNowKey(key);
  if (!normalized) return null;
  return {
    status: 200,
    path: `/${normalized}.txt`,
    body: normalized,
    contentType: "text/plain; charset=utf-8",
  };
}

function safeErrorMessage(error: unknown, key: string): string {
  const raw =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : "Unknown IndexNow request error";
  return raw.replaceAll(key, "[redacted]").slice(0, 300);
}

export async function submitUrls(
  urls: string[],
  options: IndexNowSubmitOptions = {},
): Promise<IndexNowBatchResult[]> {
  const rawKey = (options.keyProvider ?? (() => process.env.INDEXNOW_KEY))();
  const key = normalizeIndexNowKey(rawKey);
  if (!rawKey) {
    console.warn("[indexnow] INDEXNOW_KEY not set; skipping");
    return [];
  }
  if (!key) {
    console.warn(
      "[indexnow] INDEXNOW_KEY is invalid; expected 8-128 URL-safe characters",
    );
    return [];
  }

  const clean = Array.from(new Set(urls)).filter((value) => {
    try {
      const parsed = new URL(value);
      return (
        parsed.protocol === "https:" &&
        parsed.host === INDEXNOW_HOST
      );
    } catch {
      return false;
    }
  });
  const results: IndexNowBatchResult[] = [];
  const fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
  const totalBatches = Math.ceil(
    clean.length / INDEXNOW_MAX_URLS_PER_REQUEST,
  );

  for (
    let offset = 0;
    offset < clean.length;
    offset += INDEXNOW_MAX_URLS_PER_REQUEST
  ) {
    const batch = clean.slice(
      offset,
      offset + INDEXNOW_MAX_URLS_PER_REQUEST,
    );
    const batchNumber =
      Math.floor(offset / INDEXNOW_MAX_URLS_PER_REQUEST) + 1;
    try {
      const response = await fetchImpl(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          host: INDEXNOW_HOST,
          key,
          keyLocation: indexNowKeyLocation(key),
          urlList: batch,
        }),
      });
      results.push({
        status: response.status,
        ok: response.ok || response.status === 202,
        count: batch.length,
      });
      console.log(
        `[indexnow] batch ${batchNumber}/${totalBatches}: ${batch.length} URLs -> HTTP ${response.status}`,
      );
    } catch (error) {
      results.push({ status: 0, ok: false, count: batch.length });
      console.error(
        `[indexnow] batch ${batchNumber}/${totalBatches} failed (non-fatal): ${safeErrorMessage(error, key)}`,
      );
    }
  }
  return results;
}