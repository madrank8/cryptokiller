import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import {
  BLOG_HUB,
  INVESTIGATIONS_HUB,
  blogUrl,
  reviewLocaleUrl,
  reviewUrl,
} from "../../api-server/src/canonical-urls";
import {
  blogIndexNowUrlsForSync,
  reviewIndexNowUrlsForSync,
} from "../../api-server/src/indexnow-publish";
import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_HOST,
  INDEXNOW_MAX_URLS_PER_REQUEST,
  createIndexNowSubmitter,
  type IndexNowLogger,
} from "../../api-server/src/indexnow";
import {
  getIndexNowOwnership,
  normalizeIndexNowKey,
} from "../server/indexnow";

const TEST_SECRET = "indexnow-test-placeholder";

type CapturedPayload = {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
};

type CapturedLog = {
  level: "info" | "warn" | "error";
  context: Record<string, unknown>;
  message: string;
};

function captureLogger(logs: CapturedLog[]): IndexNowLogger {
  return {
    info(context, message) {
      logs.push({ level: "info", context, message });
    },
    warn(context, message) {
      logs.push({ level: "warn", context, message });
    },
    error(context, message) {
      logs.push({ level: "error", context, message });
    },
  };
}

function assertSecretAbsent(value: unknown, label: string): void {
  assert.ok(
    !JSON.stringify(value).includes(TEST_SECRET),
    `${label} must not expose the configured key`,
  );
}

async function verifyPublishUrlSelection(): Promise<void> {
  assert.deepEqual(
    reviewIndexNowUrlsForSync("master-review", "published", [
      { locale: "es", slug: "resena-traducida" },
      { locale: "pt-BR", slug: "analise-traduzida" },
    ]),
    [
      reviewUrl("master-review"),
      reviewLocaleUrl("es", "resena-traducida"),
      reviewLocaleUrl("pt-BR", "analise-traduzida"),
      INVESTIGATIONS_HUB,
    ],
    "published review sync must include master, translation-own slugs, and hub",
  );
  assert.deepEqual(
    reviewIndexNowUrlsForSync("master-review", "draft", [
      { locale: "es", slug: "resena-traducida" },
    ]),
    [],
    "draft review sync must not submit any URL",
  );
  assert.deepEqual(
    blogIndexNowUrlsForSync("safety-guide", "published"),
    [blogUrl("safety-guide"), BLOG_HUB],
    "published blog sync must include canonical post and blog hub",
  );
  assert.deepEqual(
    blogIndexNowUrlsForSync("safety-guide", "draft"),
    [],
    "draft blog sync must not submit any URL",
  );
}

async function verifyOwnershipContract(): Promise<void> {
  const ownership = getIndexNowOwnership(TEST_SECRET);
  assert.ok(ownership);
  assert.equal(ownership.status, 200);
  assert.equal(ownership.path, `/${TEST_SECRET}.txt`);
  assert.equal(ownership.body, TEST_SECRET);
  assert.equal(ownership.contentType, "text/plain; charset=utf-8");
  assert.equal(normalizeIndexNowKey("short"), null);
  assert.equal(getIndexNowOwnership("invalid/key"), null);

  const publicFiles = await readdir(
    new URL("../public/", import.meta.url),
  );
  const staticKeyFiles = publicFiles.filter((name) =>
    /^[A-Za-z0-9_-]{8,128}\.txt$/.test(name),
  );
  assert.deepEqual(
    staticKeyFiles,
    [],
    "static public directory must not contain ownership-key artifacts",
  );
}

async function verifyRequestCapture(): Promise<void> {
  const payloads: CapturedPayload[] = [];
  const logs: CapturedLog[] = [];
  const fetchImpl = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    assert.equal(String(input), INDEXNOW_ENDPOINT);
    assert.equal(init?.method, "POST");
    payloads.push(
      JSON.parse(String(init?.body)) as CapturedPayload,
    );
    return new Response("", { status: 202 });
  }) as typeof fetch;
  const submit = createIndexNowSubmitter({
    fetchImpl,
    keyProvider: () => TEST_SECRET,
    logger: captureLogger(logs),
  });

  const canonicalUrls = Array.from(
    { length: INDEXNOW_MAX_URLS_PER_REQUEST + 5 },
    (_, index) => `https://${INDEXNOW_HOST}/review/captured-${index}`,
  );
  const status = await submit([
    ...canonicalUrls,
    canonicalUrls[0],
    "https://example.com/review/not-ours",
    `http://${INDEXNOW_HOST}/review/not-https`,
    "not-a-url",
  ]);

  assert.equal(status, 202);
  assert.equal(payloads.length, 2, "10,005 URLs must produce two requests");
  assert.deepEqual(
    payloads.map((payload) => payload.urlList.length),
    [INDEXNOW_MAX_URLS_PER_REQUEST, 5],
  );
  assert.equal(
    payloads.flatMap((payload) => payload.urlList).length,
    canonicalUrls.length,
    "same-host URLs must be deduplicated before batching",
  );
  for (const payload of payloads) {
    assert.equal(payload.host, INDEXNOW_HOST);
    assert.equal(payload.key, TEST_SECRET);
    assert.equal(
      payload.keyLocation,
      `https://${INDEXNOW_HOST}/${TEST_SECRET}.txt`,
    );
    assert.ok(
      payload.urlList.length <= INDEXNOW_MAX_URLS_PER_REQUEST,
      "an outbound URL list exceeded IndexNow's 10,000 URL cap",
    );
    assert.ok(
      payload.urlList.every((value) => {
        const url = new URL(value);
        return url.protocol === "https:" && url.host === INDEXNOW_HOST;
      }),
      "outbound payload contains an off-host or non-HTTPS URL",
    );
  }
  assertSecretAbsent(logs, "accepted-request logs");
}

async function verifyFailureRedaction(): Promise<void> {
  const thrownLogs: CapturedLog[] = [];
  const throwingSubmit = createIndexNowSubmitter({
    fetchImpl: (async () => {
      throw new Error(`simulated failure near ${TEST_SECRET}`);
    }) as typeof fetch,
    keyProvider: () => TEST_SECRET,
    logger: captureLogger(thrownLogs),
  });
  assert.equal(
    await throwingSubmit([reviewUrl("failure-case")]),
    null,
    "network errors must remain non-fatal",
  );
  assertSecretAbsent(thrownLogs, "network-failure logs");
  assert.ok(
    JSON.stringify(thrownLogs).includes("[redacted]"),
    "network failure diagnostics should explicitly redact a leaked key",
  );

  const rejectedLogs: CapturedLog[] = [];
  const rejectedSubmit = createIndexNowSubmitter({
    fetchImpl: (async () =>
      new Response(TEST_SECRET, { status: 403 })) as typeof fetch,
    keyProvider: () => TEST_SECRET,
    logger: captureLogger(rejectedLogs),
  });
  assert.equal(
    await rejectedSubmit([reviewUrl("rejected-case")]),
    403,
  );
  assertSecretAbsent(rejectedLogs, "rejected-request logs");
  assert.ok(
    rejectedLogs.some(
      (entry) =>
        entry.level === "warn" &&
        entry.message.includes("ownership-file availability"),
    ),
    "rejection diagnostics must point operators toward ownership verification",
  );
}

async function main(): Promise<void> {
  await verifyPublishUrlSelection();
  await verifyOwnershipContract();
  await verifyRequestCapture();
  await verifyFailureRedaction();
  console.log(
    "IndexNow contract verified: ownership, publish guards, hubs, batching, and redaction.",
  );
}

main().catch((error) => {
  console.error(
    `IndexNow contract verification failed: ${
      error instanceof Error ? error.message : "unknown assertion"
    }`,
  );
  process.exit(1);
});