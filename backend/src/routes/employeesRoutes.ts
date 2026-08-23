import { Router } from "express";
import { EmployeesController } from "../controller/EmployeesController.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { faceValidationLimiter } from "../middleware/RateLimitMiddleware.js";

const employeesRoutes = Router();
const employeesController = new EmployeesController();

employeesRoutes.get("/", authMiddleware, (req, res) => employeesController.getEmployees(req, res));
employeesRoutes.post("/", authMiddleware, (req, res) => employeesController.createEmployee(req, res));
employeesRoutes.post("/bulk-import", authMiddleware, (req, res) => employeesController.bulkImport(req, res));
employeesRoutes.get("/face/token", authMiddleware, faceValidationLimiter, (req, res) => employeesController.issueFaceToken(req, res));
employeesRoutes.post("/face/verify", authMiddleware, faceValidationLimiter, (req, res) => employeesController.verifyFace(req, res));

export { employeesRoutes };
