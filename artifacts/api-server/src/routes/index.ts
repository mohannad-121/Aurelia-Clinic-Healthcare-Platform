import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import publicRouter from "./public";
import bookingRouter from "./booking";
import manageRouter from "./manage";
import summaryRouter from "./summary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(publicRouter);
router.use(authRouter);
router.use(bookingRouter);
router.use(manageRouter);
router.use(summaryRouter);

export default router;
