import twilio from "twilio";
import { logger } from "./logger";

const log = logger.child({ module: "github-sync-status" });

export interface GithubSyncStatus {
  lastRunAt: string | null;
  lastResult: "success" | "failure" | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  alertSentForCurrentStreak: boolean;
}

const status: GithubSyncStatus = {
  lastRunAt: null,
  lastResult: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastError: null,
  consecutiveFailures: 0,
  alertSentForCurrentStreak: false,
};

export function getGithubSyncStatus(): GithubSyncStatus {
  return { ...status };
}

async function sendWhatsappAlert(message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  const to = process.env.ALERT_WHATSAPP_TO;

  if (!accountSid || !authToken || !from || !to) {
    log.warn(
      {
        haveSid: Boolean(accountSid),
        haveToken: Boolean(authToken),
        haveFrom: Boolean(from),
        haveTo: Boolean(to),
      },
      "GitHub sync failure alert NOT sent: Twilio alert env vars incomplete (need TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, ALERT_WHATSAPP_TO)",
    );
    return false;
  }

  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
      to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
      body: message,
    });
    log.info("GitHub sync failure alert sent via WhatsApp");
    return true;
  } catch (err) {
    log.error(
      { err: err instanceof Error ? err.message : String(err) },
      "Failed to send GitHub sync failure alert via WhatsApp",
    );
    return false;
  }
}

export function recordGithubSyncSuccess(): void {
  const now = new Date().toISOString();
  const recovered = status.consecutiveFailures > 0;
  status.lastRunAt = now;
  status.lastResult = "success";
  status.lastSuccessAt = now;
  status.lastError = null;
  status.consecutiveFailures = 0;
  status.alertSentForCurrentStreak = false;

  if (recovered) {
    void sendWhatsappAlert(
      `✅ CryptoKiller: daily GitHub backup sync recovered at ${now}.`,
    );
  }
}

export function recordGithubSyncFailure(errorMessage: string): void {
  const now = new Date().toISOString();
  status.lastRunAt = now;
  status.lastResult = "failure";
  status.lastFailureAt = now;
  status.lastError = errorMessage.slice(0, 2000);
  status.consecutiveFailures += 1;

  // One alert per failure streak — don't spam on repeated daily failures.
  if (!status.alertSentForCurrentStreak) {
    void sendWhatsappAlert(
      [
        "🚨 CryptoKiller: daily GitHub backup sync FAILED.",
        `Time: ${now}`,
        `Error: ${errorMessage.slice(0, 300)}`,
        "Workspace/GitHub drift may be accumulating. Check the API server logs or GET /api/admin/github-sync-status.",
      ].join("\n"),
    ).then((sent) => {
      if (sent) status.alertSentForCurrentStreak = true;
    });
  }
}
