import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reviewsRouter from "./reviews";
import syncRouter from "./sync";
import supabaseSyncRouter from "./supabase-sync";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(reviewsRouter);
router.use(syncRouter);
router.use(supabaseSyncRouter);
router.use(reportsRouter);

export default router;
