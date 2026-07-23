import { Router } from "express";
import { EmployeesController } from "../controller/EmployeesController.js";

import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { faceValidationLimiter } from "../middleware/RateLimitMiddleware.js";

const employeesRoutes = Router();
const employeesController = new EmployeesController();

employeesRoutes.get("/", authMiddleware, employeesController.getEmployees);
employeesRoutes.get("/face/token", authMiddleware, faceValidationLimiter, employeesController.issueFaceToken);
employeesRoutes.post("/face/verify", authMiddleware, faceValidationLimiter, employeesController.verifyFace)

export { employeesRoutes }
