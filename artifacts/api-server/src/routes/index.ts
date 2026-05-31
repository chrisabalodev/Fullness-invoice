import { Router, type IRouter } from "express";
import healthRouter from "./health";
import companyRouter from "./company";
import clientsRouter from "./clients";
import articlesRouter from "./articles";
import documentsRouter from "./documents";
import reglementsRouter from "./reglements";
import dashboardRouter from "./dashboard";
import dataRouter from "./data";
import licenseRouter, { licenseGuard } from "./license";

const router: IRouter = Router();

// Health + license endpoints must stay reachable even when the license expired.
router.use(healthRouter);
router.use(licenseRouter);

// Server-side enforcement: everything below is blocked while the license is expired.
router.use(licenseGuard);
router.use(companyRouter);
router.use(clientsRouter);
router.use(articlesRouter);
router.use(documentsRouter);
router.use(reglementsRouter);
router.use(dashboardRouter);
router.use(dataRouter);

export default router;
