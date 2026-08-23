import { Router } from "express";
import { MetricsController } from "../controller/MetricsController.js";
import { metricsLimiter } from "../middleware/RateLimitMiddleware.js";

const metricsRoutes = Router();
const metricsController = new MetricsController();

metricsRoutes.post("/track", metricsLimiter, (req, res) => metricsController.track(req, res));
metricsRoutes.post("/event", metricsLimiter, (req, res) => metricsController.trackEvent(req, res));

export { metricsRoutes };
