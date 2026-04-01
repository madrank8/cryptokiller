import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reviewsRouter from "./reviews";
import syncRouter from "./sync";

const router: IRouter = Router();

router.use(healthRouter);
router.use(reviewsRouter);
router.use(syncRouter);

export default router;
