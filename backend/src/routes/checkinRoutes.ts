import { Router } from "express";
import { CheckinController } from "../controller/CheckinController.js";
import { AfdController } from "../controller/AfdController.js";
import { AejController } from "../controller/AejController.js";

import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { checkinLimiter } from "../middleware/RateLimitMiddleware.js";

const checkinRoutes = Router();
const checkinController = new CheckinController();
const afdController = new AfdController();
const aejController = new AejController();

checkinRoutes.post("/", authMiddleware, checkinLimiter, checkinController.createCheckin);
checkinRoutes.get("/export/afd", authMiddleware, afdController.exportAfd);
checkinRoutes.get("/export/aej", authMiddleware, aejController.exportAej);
checkinRoutes.get("/export/relatorio-mensal", authMiddleware, checkinController.exportRelatorioMensal);
checkinRoutes.get("/company", authMiddleware, checkinController.listByCompany);
checkinRoutes.get("/month", authMiddleware, checkinController.listMonthly);
checkinRoutes.get("/", authMiddleware, checkinController.index);

export { checkinRoutes }