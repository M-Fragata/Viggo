import { Router } from "express";
import { JustificativaController } from "../controller/JustificativaController.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";

const justificativaRoutes = Router();
const justificativaController = new JustificativaController();

justificativaRoutes.post("/", authMiddleware, justificativaController.create);
justificativaRoutes.get("/", authMiddleware, justificativaController.list);
justificativaRoutes.put("/:id/aprovar", authMiddleware, justificativaController.approve);
justificativaRoutes.get("/:id/comprovante", authMiddleware, justificativaController.downloadComprovante);

export { justificativaRoutes };
