import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/AuthMiddleware.js";
import { requireMaster } from "../middleware/RoleGuard.js";
import {
  findUsersNeedingBiometricRevalidation,
  purgeExpiredBiometricDescriptors,
  notifyBiometricRevalidationPending,
  getBiometricExpiryInfo,
} from "../utils/biometricRevalidation.js";
import { extendedPrisma } from "../database/prisma-extensions.js";

const biometricRevalidationRoutes = Router();

biometricRevalidationRoutes.get(
  "/expired",
  authMiddleware,
  requireMaster,
  async (req: Request, res: Response) => {
    try {
      const users = await findUsersNeedingBiometricRevalidation();
      return res.json({ users, count: users.length });
    } catch (error) {
      console.error("Erro ao buscar usuários com biometria expirada:", error);
      return res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  }
);

biometricRevalidationRoutes.post(
  "/purge-expired",
  authMiddleware,
  requireMaster,
  async (req: Request, res: Response) => {
    try {
      const result = await purgeExpiredBiometricDescriptors();
      return res.json(result);
    } catch (error) {
      console.error("Erro ao purgar biometria expirada:", error);
      return res.status(500).json({ message: "Erro ao purgar biometria expirada" });
    }
  }
);

biometricRevalidationRoutes.post(
  "/notify/:userId",
  authMiddleware,
  requireMaster,
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId as string;
      await notifyBiometricRevalidationPending(userId);
      return res.json({ message: "Notificação marcada", userId });
    } catch (error) {
      console.error("Erro ao marcar notificação:", error);
      return res.status(500).json({ message: "Erro ao marcar notificação" });
    }
  }
);

biometricRevalidationRoutes.get(
  "/status/:userId",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId as string;
      const user = await extendedPrisma.user.findUnique({
        where: { id: userId },
        select: { faceDescriptorUpdatedAt: true },
      });

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const info = getBiometricExpiryInfo(user.faceDescriptorUpdatedAt);
      return res.json({ userId, ...info });
    } catch (error) {
      console.error("Erro ao verificar status biométrico:", error);
      return res.status(500).json({ message: "Erro ao verificar status" });
    }
  }
);

export { biometricRevalidationRoutes };