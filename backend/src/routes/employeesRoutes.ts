import { Router } from "express";
import { EmployeesController } from "../controller/EmployeesController.js";

import { authMiddleware } from "../middleware/AuthMiddleware.js";

const employeesRoutes = Router();
const employeesController = new EmployeesController();

employeesRoutes.get("/", authMiddleware, employeesController.getEmployees);

export { employeesRoutes }