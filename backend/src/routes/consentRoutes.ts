import { Router } from "express";
import { ConsentController } from "../controller/ConsentController.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";

const consentRoutes = Router();
const consentController = new ConsentController();

consentRoutes.post("/", authMiddleware, consentController.create);
consentRoutes.get("/", authMiddleware, consentController.list);

export { consentRoutes };
