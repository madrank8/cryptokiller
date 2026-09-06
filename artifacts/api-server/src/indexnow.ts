// IndexNow submission module.
//
// All callers treat this as fire-and-forget: failures are diagnostic only and
// never roll back or delay a successful content publication.

import { logger } from "./lib/logger";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_HOST = "cryptokiller.org";
export const INDEXNOW_MAX_URLS_PER_REQUEST = 10_000;

const log = logger.child({ module: "indexnow" });

export interface IndexNowLogger {
  info(context: Record<string, unknown>, message: string): void;
  warn(context: Record<string, unknown>, message: string): void;
  error(context: Record<string, unknown>, message: string): void;
}

export interface IndexNowSubmitterOptions {
  fetchImpl?: typeof fetch;
  keyProvider?: () => string | null | undefined;
  logger?: IndexNowLogger;
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

function submissionUrls(urls: readonly string[]): string[] {
  return Array.from(new Set(urls)).filter((value) => {
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
}

function safeErrorMessage(error: unknown, key: string): string {
  const raw =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : "Unknown IndexNow request error";
  return raw.replaceAll(key, "[redacted]").slice(0, 300);
}

/**
 * Dependency-injected factory used by the deterministic request-capture
 * verifier. Production callers use the exported submitUrls instance below.
 */
export function createIndexNowSubmitter(
  options: IndexNowSubmitterOptions = {},
): (urls: string[]) => Promise<number | null> {
  const fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
  const keyProvider = options.keyProvider ?? (() => process.env.INDEXNOW_KEY);
  const loggerImpl = options.logger ?? log;

  return async (urls: string[]): Promise<number | null> => {
    const rawKey = keyProvider();
    const key = normalizeIndexNowKey(rawKey);
    if (!rawKey) {
      loggerImpl.warn({}, "INDEXNOW_KEY not set; skipping IndexNow submission");
      return null;
    }
    if (!key) {
      loggerImpl.warn(
        {},
        "INDEXNOW_KEY is invalid; expected 8-128 URL-safe characters",
      );
      return null;
    }

    const list = submissionUrls(urls);
    if (list.length === 0) return null;

    const totalBatches = Math.ceil(
      list.length / INDEXNOW_MAX_URLS_PER_REQUEST,
    );
    let aggregateStatus: number | null = null;
    let requestFailed = false;

    for (
      let offset = 0;
      offset < list.length;
      offset += INDEXNOW_MAX_URLS_PER_REQUEST
    ) {
      const batch = list.slice(
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
        aggregateStatus ??= response.status;

        const context = {
          batch: batchNumber,
          totalBatches,
          count: batch.length,
          status: response.status,
        };
        if (response.ok || response.status === 202) {
          loggerImpl.info(context, "IndexNow submission accepted");
        } else {
          aggregateStatus = response.status;
          loggerImpl.warn(
            context,
            "IndexNow submission rejected; verify ownership-file availability and URL canonicalization",
          );
        }
      } catch (error) {
        requestFailed = true;
        loggerImpl.error(
          {
            batch: batchNumber,
            totalBatches,
            count: batch.length,
            error: safeErrorMessage(error, key),
          },
          "IndexNow submission failed (non-fatal)",
        );
      }
    }

    return requestFailed ? null : aggregateStatus;
  };
}

export const submitUrls = createIndexNowSubmitter();

/**
 * Fire-and-forget wrapper. Never awaited and never throws into the request
 * lifecycle, even if IndexNow or ownership validation is unavailable.
 */
export function pingIndexNow(urls: string[]): void {
  if (urls.length > 0) void submitUrls(urls);
}