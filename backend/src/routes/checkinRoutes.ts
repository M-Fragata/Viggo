import { Router } from "express";
import { CheckinController } from "../controller/CheckinController.js";

import { authMiddleware } from "../middleware/AuthMiddleware.js";

const checkinRoutes = Router();
const checkinController = new CheckinController();

checkinRoutes.post("/", authMiddleware, checkinController.createCheckin);
checkinRoutes.get("/", authMiddleware, checkinController.index);

export { checkinRoutes }