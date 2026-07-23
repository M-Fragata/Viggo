import { Router } from "express";
import { CheckinController } from "../controller/CheckinController.js";
import { AfdController } from "../controller/AfdController.js";

import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { checkinLimiter } from "../middleware/RateLimitMiddleware.js";
import { auditMiddleware } from "../middleware/AuditMiddleware.js";

const checkinRoutes = Router();
const checkinController = new CheckinController();
const afdController = new AfdController();

checkinRoutes.post("/", authMiddleware, checkinLimiter, auditMiddleware, checkinController.createCheckin);
checkinRoutes.get("/export/afd", authMiddleware, afdController.exportAfd);
checkinRoutes.get("/company", authMiddleware, checkinController.listByCompany);
checkinRoutes.get("/month", authMiddleware, checkinController.listMonthly);
checkinRoutes.get("/", authMiddleware, checkinController.index);

export { checkinRoutes }