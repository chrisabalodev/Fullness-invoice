import { Router, type IRouter } from "express";
import healthRouter from "./health";
import companyRouter from "./company";
import clientsRouter from "./clients";
import articlesRouter from "./articles";
import documentsRouter from "./documents";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(companyRouter);
router.use(clientsRouter);
router.use(articlesRouter);
router.use(documentsRouter);
router.use(dashboardRouter);

export default router;
