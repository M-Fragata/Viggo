import { Router } from "express";
import { SessionController } from "../controller/SessionController.js";
import { authLimiter } from "../middleware/RateLimitMiddleware.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";

const sessionRoutes = Router();
const sessionController = new SessionController();

sessionRoutes.post("/login", authLimiter, sessionController.login);
sessionRoutes.put("/:userId", authMiddleware, sessionController.update)

export { sessionRoutes }