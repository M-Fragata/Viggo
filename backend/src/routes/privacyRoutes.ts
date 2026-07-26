import { Router } from "express";
import { PrivacyController } from "../controller/PrivacyController.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";

const privacyRoutes = Router();
const privacyController = new PrivacyController();

privacyRoutes.get("/my-data", authMiddleware, privacyController.getMyData);
privacyRoutes.put("/my-data", authMiddleware, privacyController.updateMyData);
privacyRoutes.get("/export", authMiddleware, privacyController.exportMyData);
privacyRoutes.delete("/my-face", authMiddleware, privacyController.deleteMyFace);
privacyRoutes.get("/my-logs", authMiddleware, privacyController.getMyLogs);

export { privacyRoutes };
