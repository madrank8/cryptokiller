import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { logger } from "./logger";

const WORKSPACE = "/home/runner/workspace";
const VERIFY_SCRIPT = `${WORKSPACE}/scripts/src/verify-agent-api.ts`;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily
const INITIAL_DELAY_MS = 3 * 60 * 1000; // 3 minutes after boot (offset from GitHub sync)
const CHECK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

let running = false;

function runDriftCheck(): Promise<void> {
  return new Promise((resolve) => {
    if (running) {
      logger.warn("Agent-API drift check already running — skipping this cycle");
      resolve();
      return;
    }
    running = true;
    const startedAt = Date.now();
    logger.info("Agent-API drift check against live site starting");

    // Strip any base-URL overrides so the script targets its default,
    // https://cryptokiller.org (the live production site).
    const env = { ...process.env };
    delete env["VERIFY_BASE_URL"];
    delete env["VERIFY_API_BASE_URL"];

    execFile(
      "pnpm",
      ["--filter", "@workspace/scripts", "run", "verify:agent-api"],
      {
        cwd: WORKSPACE,
        timeout: CHECK_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
        env,
      },
      (err, stdout, stderr) => {
        running = false;
        const durationMs = Date.now() - startedAt;
        if (err) {
          const failLines = stdout
            .split("\n")
            .filter((l) => l.includes("FAIL") || l.startsWith("RESULT:"))
            .slice(-20)
            .join(" | ");
          logger.error(
            { err: err.message, failLines, stderr: stderr.slice(-1000), durationMs },
            "Agent-API drift check FAILED — live site discovery documents drift from the API",
          );
        } else {
          const summary = stdout
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(-2)
            .join(" | ");
          logger.info({ durationMs, summary }, "Agent-API drift check passed");
        }
        resolve();
      },
    );
  });
}

export function startAgentApiDriftScheduler(): void {
  // The check shells out to the workspace scripts package via pnpm/tsx, which
  // only exists in the development environment (production bundles exclude it).
  if (!existsSync(VERIFY_SCRIPT)) {
    logger.info(
      "Agent-API drift scheduler disabled: workspace scripts not available (production deployment)",
    );
    return;
  }

  logger.info(
    { intervalHours: CHECK_INTERVAL_MS / 3_600_000, target: "https://cryptokiller.org" },
    "Agent-API drift scheduler enabled",
  );

  setTimeout(() => {
    void runDriftCheck();
    setInterval(() => {
      void runDriftCheck();
    }, CHECK_INTERVAL_MS).unref();
  }, INITIAL_DELAY_MS).unref();
}
