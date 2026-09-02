import { Router } from "express";
import { EspelhoPontoController } from "../controller/EspelhoPontoController.js";
import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { requireEnterpriseAdmin } from "../middleware/RoleGuard.js";

const espelhoRoutes = Router();
const espelhoController = new EspelhoPontoController();

// Rotas do RH / Administrador (Multi-tenant)
espelhoRoutes.post("/fechamento", authMiddleware, requireEnterpriseAdmin, espelhoController.liberarFechamento);
espelhoRoutes.get("/empresa", authMiddleware, requireEnterpriseAdmin, espelhoController.listarEspelhosEmpresa);

// Rotas do Colaborador e Detalhes
espelhoRoutes.get("/me", authMiddleware, espelhoController.listarMeusEspelhos);
espelhoRoutes.get("/:id", authMiddleware, espelhoController.obterEspelhoDetalhes);
espelhoRoutes.post("/:id/assinar", authMiddleware, espelhoController.assinarEspelho);
espelhoRoutes.post("/:id/contestar", authMiddleware, espelhoController.contestarEspelho);
espelhoRoutes.get("/:id/pdf", authMiddleware, espelhoController.downloadEspelhoPdf);

export { espelhoRoutes };
