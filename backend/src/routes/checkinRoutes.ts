import { Router } from "express";
import { CheckinController } from "../controller/CheckinController.js";

import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { checkinLimiter } from "../middleware/RateLimitMiddleware.js";
import { auditMiddleware } from "../middleware/AuditMiddleware.js";

const checkinRoutes = Router();
const checkinController = new CheckinController();

checkinRoutes.post("/", authMiddleware, checkinLimiter, auditMiddleware, checkinController.createCheckin);
checkinRoutes.get("/company", authMiddleware, checkinController.listByCompany);
checkinRoutes.get("/", authMiddleware, checkinController.index);
checkinRoutes.get("/month", authMiddleware, checkinController.listMonthly);

export { checkinRoutes }