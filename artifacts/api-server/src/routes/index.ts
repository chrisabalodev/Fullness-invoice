import { Router, type IRouter } from "express";
import healthRouter from "./health";
import companyRouter from "./company";
import clientsRouter from "./clients";
import articlesRouter from "./articles";
import documentsRouter from "./documents";
import reglementsRouter from "./reglements";
import dashboardRouter from "./dashboard";
import dataRouter from "./data";

const router: IRouter = Router();

router.use(healthRouter);
router.use(companyRouter);
router.use(clientsRouter);
router.use(articlesRouter);
router.use(documentsRouter);
router.use(reglementsRouter);
router.use(dashboardRouter);
router.use(dataRouter);

export default router;
