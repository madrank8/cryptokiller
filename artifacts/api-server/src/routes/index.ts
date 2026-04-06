import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reviewsRouter from "./reviews";
import syncRouter from "./sync";
import supabaseSyncRouter from "./supabase-sync";
import blogSyncRouter from "./blog-sync";
import blogRouter from "./blog";
import reportsRouter from "./reports";
import whatsappRouter from "./whatsapp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(reviewsRouter);
router.use(syncRouter);
router.use(supabaseSyncRouter);
router.use(blogSyncRouter);
router.use(blogRouter);
router.use(reportsRouter);
router.use(whatsappRouter);

export default router;
