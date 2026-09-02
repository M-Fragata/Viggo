import { Router } from "express";
import { WorkLocationController } from "../controller/WorkLocationController.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";

const workLocationRoutes = Router();
const controller = new WorkLocationController();

// Apenas usuários autenticados (validação de role de admin é feita no controller)
workLocationRoutes.use(authMiddleware);

workLocationRoutes.post("/", (req, res) => controller.create(req, res));
workLocationRoutes.get("/", (req, res) => controller.list(req, res));
workLocationRoutes.put("/:id", (req, res) => controller.update(req, res));
workLocationRoutes.delete("/:id", (req, res) => controller.remove(req, res));

export { workLocationRoutes };
