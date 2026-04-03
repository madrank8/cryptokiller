import { Router, type IRouter } from "express";
import { runSupabaseSync } from "../lib/supabase-sync";
import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/sync/supabase", async (req, res): Promise<void> => {
  const secret = req.headers["x-sync-secret"] as string | undefined;
  const expected = process.env.SYNC_SECRET;
  if (!expected || secret !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!supabase) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  const log = logger.child({ route: "supabase-sync" });

  try {
    const result = await runSupabaseSync();
    log.info(result, "Manual sync triggered via API");
    res.json({ message: "Sync complete", ...result });
  } catch (err) {
    log.error(err, "Supabase sync failed");
    res.status(500).json({ error: "Sync failed", detail: String(err) });
  }
});

export default router;
