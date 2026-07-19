import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { logger } from "./logger";
import {
  recordGithubSyncFailure,
  recordGithubSyncSuccess,
} from "./github-sync-status";

const WORKSPACE = "/home/runner/workspace";
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily
const INITIAL_DELAY_MS = 60 * 1000; // 1 minute after boot
const SYNC_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

let running = false;

function runGithubSync(): Promise<void> {
  return new Promise((resolve) => {
    if (running) {
      logger.warn("GitHub sync already running — skipping this cycle");
      resolve();
      return;
    }
    running = true;
    const startedAt = Date.now();
    logger.info("GitHub backup sync starting");
    execFile(
      "pnpm",
      ["--filter", "@workspace/scripts", "run", "github:sync"],
      {
        cwd: WORKSPACE,
        timeout: SYNC_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
        env: process.env,
      },
      (err, stdout, stderr) => {
        running = false;
        const durationMs = Date.now() - startedAt;
        if (err) {
          logger.error(
            { err: err.message, stdout, stderr, durationMs },
            "GitHub backup sync FAILED — workspace/GitHub drift may be accumulating",
          );
          recordGithubSyncFailure(
            `${err.message}${stderr ? ` | stderr: ${stderr.slice(-500)}` : ""}`,
          );
        } else {
          const summary = stdout
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(-4)
            .join(" | ");
          logger.info({ durationMs, summary }, "GitHub backup sync finished");
          recordGithubSyncSuccess();
        }
        resolve();
      },
    );
  });
}

export function startGithubSyncScheduler(): void {
  // The sync clones the workspace git repo, so it only makes sense in the
  // development environment where /home/runner/workspace/.git exists.
  if (!existsSync(`${WORKSPACE}/.git`)) {
    logger.info(
      "GitHub sync scheduler disabled: no workspace git repo (production deployment)",
    );
    return;
  }

  logger.info(
    { intervalHours: SYNC_INTERVAL_MS / 3_600_000 },
    "GitHub sync scheduler enabled",
  );

  setTimeout(() => {
    void runGithubSync();
    setInterval(() => {
      void runGithubSync();
    }, SYNC_INTERVAL_MS).unref();
  }, INITIAL_DELAY_MS).unref();
}
