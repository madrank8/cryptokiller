import app from "./app";
import { logger } from "./lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// 2026-04-21 — Architecture A: the Vercel admin's /api/sync/review webhook
// is now the single source of truth for review data. The old 2-minute
// `startSyncScheduler` loop that re-pulled from Supabase has been retired
// because it raced with and silently overwrote the webhook's richer payload
// (missing threat_score, funnel stages, FAQ, key findings, sources, images,
// protection steps, etc). The scheduler's export is still available for a
// manual one-shot rescue via POST /sync/supabase — but is no longer called
// automatically at boot.
// ─────────────────────────────────────────────────────────────────────────────

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

process.on("SIGTERM", () => {
  process.exit(0);
});

process.on("SIGINT", () => {
  process.exit(0);
});
