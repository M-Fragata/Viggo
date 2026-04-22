import { Router } from "express";
import { SessionController } from "../controller/SessionController.js";

const sessionRoutes = Router();
const sessionController = new SessionController();

sessionRoutes.post("/", sessionController.create);
sessionRoutes.post("/login", sessionController.login);
sessionRoutes.put("/:userId", sessionController.update)

export { sessionRoutes }