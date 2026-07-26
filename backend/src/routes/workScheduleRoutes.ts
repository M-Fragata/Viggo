import { Router } from "express";
import { WorkScheduleController } from "../controller/WorkScheduleController.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";

const workScheduleRoutes = Router();
const controller = new WorkScheduleController();

workScheduleRoutes.get("/", authMiddleware, controller.list);
workScheduleRoutes.post("/", authMiddleware, controller.create);
workScheduleRoutes.put("/:id", authMiddleware, controller.update);
workScheduleRoutes.delete("/:id", authMiddleware, controller.remove);
workScheduleRoutes.post("/assign", authMiddleware, controller.assignToEmployee);

export { workScheduleRoutes };
