import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { TotemController } from "../controller/TotemController.js";
import { totemAuthMiddleware } from "../middleware/TotemAuthMiddleware.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { requireEnterpriseAdmin } from "../middleware/RoleGuard.js";
import { totemPinLimiter } from "../middleware/RateLimitMiddleware.js";

const totemController = new TotemController();

const isTest = process.env.NODE_ENV === "TEST";

function totemCheckinLimiter(req: Request, _res: Response, next: NextFunction) {
  if (isTest) return next();
  const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { message: "Limite de batidas de ponto excedido. Tente novamente em 1 hora." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (r: Request) => r.ip ?? "unknown",
  });
  return limiter(req, _res, next);
}

export const totemRoutes = Router();

totemRoutes.post("/verify", totemAuthMiddleware, totemController.verify);
totemRoutes.post("/checkin", totemAuthMiddleware, totemCheckinLimiter, totemController.checkin);
totemRoutes.post("/face/verify", totemAuthMiddleware, totemController.verifyFace);
totemRoutes.post("/face/register", totemAuthMiddleware, totemController.registerFace);
totemRoutes.post("/recover", totemAuthMiddleware, totemPinLimiter, totemController.recover);

totemRoutes.post("/companies/me/totem/activate", authMiddleware, requireEnterpriseAdmin, totemController.activate);
totemRoutes.post("/companies/me/totem/deactivate", authMiddleware, requireEnterpriseAdmin, totemPinLimiter, totemController.deactivate);
