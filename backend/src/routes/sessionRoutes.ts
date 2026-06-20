import { Router } from "express";
import { SessionController } from "../controller/SessionController.js";
import { authLimiter } from "../middleware/RateLimitMiddleware.js";

const sessionRoutes = Router();
const sessionController = new SessionController();

sessionRoutes.post("/", sessionController.create);
sessionRoutes.post("/login", authLimiter, sessionController.login);
sessionRoutes.put("/:userId", sessionController.update)

export { sessionRoutes }