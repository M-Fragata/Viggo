import { type Request, type Response } from "express";
import { extendedPrisma } from "../database/prisma-extensions.js";
import { Prisma } from "@prisma/client";
import { decryptAndFormat } from "../utils/cpfEncryption.js";

export class PrivacyController {
  /**
   * GET /privacy/my-data
   * Retorna todos os dados pessoais do funcionário (DSAR — Art. 18 LGPD).
   */
  async getMyData(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const companyId = req.user.companyId;

      if (!companyId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const user = await extendedPrisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
          faceDescriptor: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const checkins = await extendedPrisma.checkIn.findMany({
        where: { userId, companyId },
        select: {
          id: true,
          nsr: true,
          createdAt: true,
          type: true,
          latitude: true,
          longitude: true,
          address: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      const consentimentos = await extendedPrisma.consentimento.findMany({
        where: { userId },
        select: {
          tipo: true,
          versao: true,
          aceite: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        dadosPessoais: {
          id: user.id,
          nome: user.name,
          email: user.email,
          cpf: user.cpf ? decryptAndFormat(user.cpf) : null,
          cargo: user.role,
          dataCadastro: user.createdAt,
          ultimoLogin: user.lastLoginAt,
        },
        dadosBiometricos: {
          possuiDescriptor: !!user.faceDescriptor,
          dimensoes: user.faceDescriptor ? 128 : 0,
          observacao:
            "Apenas o vetor matemático (128 floats) é armazenado. " +
            "Nenhuma imagem facial é gravada.",
        },
        registrosPonto: checkins,
        consentimentos,
      });
    } catch (error) {
      console.error("Erro ao buscar dados do titular:", error);
      return res
        .status(500)
        .json({ message: "Erro ao buscar dados pessoais" });
    }
  }

  /**
   * DELETE /privacy/my-face
   * Remove o descriptor facial (revogação de consentimento biométrico — Art. 18 VI/VIII LGPD).
   */
  async deleteMyFace(req: Request, res: Response) {
    try {
      const userId = req.user.id;

      const user = await extendedPrisma.user.findUnique({
        where: { id: userId },
        select: { faceDescriptor: true },
      });

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      if (!user.faceDescriptor) {
        return res.status(400).json({
          message: "Nenhum descriptor facial registrado para remoção",
        });
      }

      await extendedPrisma.user.update({
        where: { id: userId },
        data: { faceDescriptor: Prisma.DbNull },
      });

      await extendedPrisma.consentimento.upsert({
        where: {
          userId_tipo_versao: {
            userId,
            tipo: "BIOMETRIA",
            versao: "1.0",
          },
        },
        update: { aceite: false },
        create: {
          userId,
          tipo: "BIOMETRIA",
          versao: "1.0",
          aceite: false,
          ip: req.ip ?? req.socket.remoteAddress ?? null,
        },
      });

      return res.json({
        message:
          "Descriptor facial removido com sucesso. " +
          "Você precisará cadastrar novamente a face para bater ponto.",
      });
    } catch (error) {
      console.error("Erro ao remover face:", error);
      return res
        .status(500)
        .json({ message: "Erro ao remover dados biométricos" });
    }
  }

  /**
   * GET /privacy/my-logs
   * Retorna logs de acesso aos dados do funcionário (Art. 18 LGPD).
   */
  async getMyLogs(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const companyId = req.user.companyId;

      if (!companyId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const logs = await extendedPrisma.auditLog.findMany({
        where: { userId, companyId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          action: true,
          entity: true,
          entityId: true,
          createdAt: true,
          ip: true,
          legalBasis: true,
          purpose: true,
          personalDataCategories: true,
        },
      });

      return res.json({ logs });
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
      return res
        .status(500)
        .json({ message: "Erro ao buscar logs de acesso" });
    }
  }
}
