import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, ilike } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  platformsTable,
  reviewsTable,
  reviewStatsTable,
  scamReportsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const log = logger.child({ route: "whatsapp" });

const conversationState = new Map<
  string,
  { step: string; data: Record<string, string>; ts: number }
>();

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 60 * 1000;

function sanitize(input: string): string {
  return input
    .replace(/https?:\/\/\S+/gi, "[link removed]")
    .replace(/<[^>]*>/g, "")
    .replace(/[{}[\]\\]/g, "")
    .trim()
    .slice(0, 500);
}

function isRateLimited(from: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(from) ?? []).filter(
    (t) => now - t < RATE_WINDOW
  );
  if (timestamps.length >= RATE_LIMIT) {
    rateLimitMap.set(from, timestamps);
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(from, timestamps);
  return false;
}

function twiml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

async function lookupPlatform(name: string) {
  const rows = await db
    .select({
      slug: reviewsTable.slug,
      platformName: platformsTable.name,
      threatScore: reviewsTable.threatScore,
      verdict: reviewsTable.verdict,
      investigationDate: reviewsTable.investigationDate,
      adCreatives: reviewStatsTable.adCreatives,
    })
    .from(reviewsTable)
    .innerJoin(platformsTable, eq(reviewsTable.platformId, platformsTable.id))
    .leftJoin(reviewStatsTable, eq(reviewStatsTable.reviewId, reviewsTable.id))
    .where(ilike(platformsTable.name, `%${name}%`))
    .limit(1);

  return rows[0] ?? null;
}

async function getLatestAlerts() {
  const rows = await db
    .select({
      slug: reviewsTable.slug,
      platformName: platformsTable.name,
      threatScore: reviewsTable.threatScore,
      investigationDate: reviewsTable.investigationDate,
    })
    .from(reviewsTable)
    .innerJoin(platformsTable, eq(reviewsTable.platformId, platformsTable.id))
    .where(eq(reviewsTable.status, "published"))
    .orderBy(desc(reviewsTable.investigationDate))
    .limit(3);

  return rows;
}

function menuResponse(): string {
  return [
    "👋 Welcome to *CryptoKiller*",
    "Crypto Scam Intelligence — Free & Confidential",
    "",
    "What can I help you with?",
    "",
    "1️⃣ *Check a platform* — send the name",
    "2️⃣ *Report a scam* — type REPORT",
    "3️⃣ *I've been scammed* — type HELP",
    "4️⃣ *Latest scam alerts* — type ALERTS",
    "",
    "Or just send any crypto platform name to check it instantly.",
  ].join("\n");
}

async function platformCheckResponse(name: string): Promise<string> {
  const result = await lookupPlatform(name);

  if (result) {
    const date = result.investigationDate
      ? new Date(result.investigationDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "Unknown";

    return [
      "🔍 *CryptoKiller Intelligence*",
      "",
      `Checking: ${result.platformName}`,
      "",
      "⚠️ *THREAT DETECTED*",
      `Threat Score: ${result.threatScore}/100`,
      `Status: ${result.verdict ?? "Under investigation"}`,
      `Ad Creatives: ${result.adCreatives ?? 0} detected`,
      `First flagged: ${date}`,
      "",
      `Full investigation: cryptokiller.org/review/${result.slug}`,
    ].join("\n");
  }

  return [
    "🔍 *CryptoKiller Intelligence*",
    "",
    `Checking: ${name}`,
    "",
    "✅ Not in our database of 1,000+ flagged platforms.",
    "This does not guarantee it's safe — new scams emerge daily.",
    "Report it if something feels off: cryptokiller.org/report",
  ].join("\n");
}

async function alertsResponse(): Promise<string> {
  const alerts = await getLatestAlerts();

  if (alerts.length === 0) {
    return "No recent investigations available. Check cryptokiller.org/investigations for the full database.";
  }

  const lines = ["🚨 *Latest Scam Alerts*", ""];
  for (const a of alerts) {
    const date = a.investigationDate
      ? new Date(a.investigationDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "";
    lines.push(
      `• *${a.platformName}* — ${a.threatScore}/100 (${date})`,
      `  cryptokiller.org/review/${a.slug}`,
      ""
    );
  }
  lines.push("Browse all: cryptokiller.org/investigations");

  return lines.join("\n");
}

router.post("/whatsapp", async (req: Request, res: Response): Promise<void> => {
  const from: string = req.body?.From ?? "";
  const rawBody: string = req.body?.Body ?? "";
  const body = sanitize(rawBody);
  const lower = body.toLowerCase();

  if (!from || !body) {
    res.type("text/xml").send(twiml("Please send a message to get started."));
    return;
  }

  if (isRateLimited(from)) {
    res
      .type("text/xml")
      .send(
        twiml(
          "⏳ You've reached the message limit (10/hour). Please try again later."
        )
      );
    return;
  }

  const state = conversationState.get(from);

  if (state && Date.now() - state.ts > 15 * 60 * 1000) {
    conversationState.delete(from);
  }

  const activeState = conversationState.get(from);

  if (activeState) {
    let reply = "";

    switch (activeState.step) {
      case "report_platform": {
        activeState.data.platformName = body;
        activeState.step = "report_amount";
        activeState.ts = Date.now();
        reply =
          "How much did you lose approximately? (You can say 'prefer not to say')";
        break;
      }
      case "report_amount": {
        activeState.data.amountLost = body;
        activeState.step = "report_contact";
        activeState.ts = Date.now();
        reply =
          "How were you contacted? (e.g. Instagram, WhatsApp, Telegram, email, dating app)";
        break;
      }
      case "report_contact": {
        activeState.data.contactMethod = body;
        conversationState.delete(from);

        try {
          await db.insert(scamReportsTable).values({
            platformName: activeState.data.platformName ?? "Unknown",
            platformUrl: "",
            scamType: "crypto_investment",
            description: `WhatsApp report from ${from}`,
            amountLost: activeState.data.amountLost ?? "",
            currency: "USD",
            contactMethod: activeState.data.contactMethod ?? "",
            country: "",
            evidenceUrls: "",
            reporterEmail: "",
          });
          log.info(
            { from, platform: activeState.data.platformName },
            "WhatsApp scam report saved"
          );
        } catch (err) {
          log.error(err, "Failed to save WhatsApp scam report");
        }

        reply = [
          "Thank you. Your report has been logged and sent to our analysts for review.",
          "",
          "⚠️ *Critical next steps — do these NOW:*",
          "1. File with FBI IC3: ic3.gov",
          "2. File with FTC: reportfraud.ftc.gov",
          "3. Contact your bank immediately",
          "4. Do NOT pay any 'recovery' service",
          "",
          "Our team will publish an investigation if we can verify the platform. You're helping protect others. 🙏",
        ].join("\n");
        break;
      }
      default:
        conversationState.delete(from);
        break;
    }

    if (reply) {
      res.type("text/xml").send(twiml(reply));
      return;
    }
  }

  if (/^(hi|hello|hey|start|menu)$/i.test(lower)) {
    res.type("text/xml").send(twiml(menuResponse()));
    return;
  }

  if (/^(report|i was scammed|lost money|help|scammed)$/i.test(lower)) {
    conversationState.set(from, {
      step: "report_platform",
      data: {},
      ts: Date.now(),
    });
    res
      .type("text/xml")
      .send(
        twiml(
          "I'm sorry to hear that. I'll help you document this.\nWhat is the name or website of the platform that scammed you?"
        )
      );
    return;
  }

  if (/^(alerts|latest|new scams)$/i.test(lower)) {
    const reply = await alertsResponse();
    res.type("text/xml").send(twiml(reply));
    return;
  }

  const checkMatch = lower.match(/^(?:check|is)\s+(.+?)(?:\s+a\s+scam)?$/i);
  const platformName = checkMatch ? checkMatch[1] : body;

  try {
    const reply = await platformCheckResponse(platformName);
    res.type("text/xml").send(twiml(reply));
  } catch (err) {
    log.error(err, "WhatsApp platform check failed");
    res
      .type("text/xml")
      .send(
        twiml(
          "Sorry, something went wrong. Try again or visit cryptokiller.org"
        )
      );
  }
});

export default router;
