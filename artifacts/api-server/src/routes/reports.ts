import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { scamReportsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const log = logger.child({ route: "reports" });

const RATE_LIMIT = 5;
const RATE_WINDOW = 15 * 60 * 1000;
const ipRateLimitMap = new Map<string, number[]>();

function isIpRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRateLimitMap.get(ip) ?? []).filter(
    (t) => now - t < RATE_WINDOW
  );
  if (timestamps.length >= RATE_LIMIT) {
    ipRateLimitMap.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  ipRateLimitMap.set(ip, timestamps);
  return false;
}

const reportSchema = z.object({
  platformName: z.string().min(1).max(200),
  platformUrl: z.string().max(500).optional().default(""),
  scamType: z
    .enum([
      "crypto_investment",
      "celebrity_impersonation",
      "fake_exchange",
      "ponzi_scheme",
      "phishing",
      "rug_pull",
      "romance_scam",
      "other",
    ])
    .optional()
    .default("crypto_investment"),
  description: z.string().min(1).max(5000),
  amountLost: z.string().max(100).optional().default(""),
  currency: z.string().max(10).optional().default("USD"),
  contactMethod: z.string().max(200).optional().default(""),
  country: z.string().max(100).optional().default(""),
  evidenceUrls: z.string().max(1000).optional().default(""),
  reporterEmail: z.email().max(254).optional().default("").or(z.literal("")),
});

router.post(
  "/reports",
  (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";

    if (isIpRateLimited(ip)) {
      res.status(429).json({
        error: "Too many requests. Please try again later.",
      });
      return;
    }
    next();
  },
  async (req: Request, res: Response): Promise<void> => {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid report data", details: parsed.error.issues });
      return;
    }

    const data = parsed.data;

    try {
      const [report] = await db
        .insert(scamReportsTable)
        .values({
          platformName: data.platformName,
          platformUrl: data.platformUrl,
          scamType: data.scamType,
          description: data.description,
          amountLost: data.amountLost,
          currency: data.currency,
          contactMethod: data.contactMethod,
          country: data.country,
          evidenceUrls: data.evidenceUrls,
          reporterEmail: data.reporterEmail,
        })
        .returning();

      log.info({ reportId: report.id, platform: data.platformName }, "New scam report submitted");

      res.json({ ok: true, reportId: report.id });
    } catch (err) {
      log.error(err, "Failed to submit scam report");
      res.status(500).json({ error: "Failed to submit report" });
    }
  }
);

export default router;
