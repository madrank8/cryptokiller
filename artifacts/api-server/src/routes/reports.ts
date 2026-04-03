import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { scamReportsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/reports", async (req, res): Promise<void> => {
  const log = logger.child({ route: "reports" });

  try {
    const {
      platformName,
      platformUrl,
      scamType,
      description,
      amountLost,
      currency,
      contactMethod,
      country,
      evidenceUrls,
      reporterEmail,
    } = req.body;

    const trimmedName = typeof platformName === "string" ? platformName.trim() : "";
    const trimmedDesc = typeof description === "string" ? description.trim() : "";

    if (!trimmedName || !trimmedDesc) {
      res.status(400).json({ error: "platformName and description are required" });
      return;
    }

    const [report] = await db
      .insert(scamReportsTable)
      .values({
        platformName: trimmedName,
        platformUrl: platformUrl ?? "",
        scamType: scamType ?? "crypto_investment",
        description: trimmedDesc,
        amountLost: amountLost ?? "",
        currency: currency ?? "USD",
        contactMethod: contactMethod ?? "",
        country: country ?? "",
        evidenceUrls: evidenceUrls ?? "",
        reporterEmail: reporterEmail ?? "",
      })
      .returning();

    log.info({ reportId: report.id, platform: platformName }, "New scam report submitted");

    res.json({ ok: true, reportId: report.id });
  } catch (err) {
    log.error(err, "Failed to submit scam report");
    res.status(500).json({ error: "Failed to submit report" });
  }
});

export default router;
