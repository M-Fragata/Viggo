import type { Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Env } from "../utils/environment.js";
import * as emailService from "../services/email/emailService.js";

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  // 6 dígitos numéricos
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class ForgotPasswordController {
  async forgotPassword(req: Request, res: Response) {
    const bodySchema = z.object({ email: z.email("Email inválido") });
    try {
      const { email } = bodySchema.parse(req.body);
      const user = await prisma.user.findUnique({ where: { email } });
      // Sempre retorna sucesso para não revelar existência
      if (!user) {
        return res.json({ message: "Se o email existir, um código foi enviado." });
      }
      const code = generateCode();
      const hashed = hashCode(code);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetCode: hashed,
          resetCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          resetCodeAttempts: 0,
        },
      });
      void emailService.sendResetPassword({ to: email, code }).catch((err) => console.error("[Email] reset-password failed:", err));
      return res.json({ message: "Se o email existir, um código foi enviado.", email });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      console.error("forgotPassword error:", error);
      return res.status(500).json({ message: "Erro ao processar solicitação" });
    }
  }

  async verifyResetCode(req: Request, res: Response) {
    const bodySchema = z.object({ email: z.email(), code: z.string().length(6) });
    try {
      const { email, code } = bodySchema.parse(req.body);
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.resetCode || !user.resetCodeExpiresAt) {
        return res.status(400).json({ message: "Código inválido ou expirado" });
      }
      if ((user.resetCodeAttempts ?? 0) >= 5) {
        return res.status(400).json({ message: "Número máximo de tentativas atingido. Solicite um novo código." });
      }
      if (user.resetCodeExpiresAt < new Date()) {
        return res.status(400).json({ message: "Código expirado. Solicite um novo código." });
      }
      if (hashCode(code) !== user.resetCode) {
        await prisma.user.update({ where: { id: user.id }, data: { resetCodeAttempts: { increment: 1 } } });
        const attempts = (user.resetCodeAttempts ?? 0) + 1;
        return res.status(400).json({ message: `Código inválido. Tentativas: ${attempts}/5` });
      }
      // Código correto — gera JWT de reset (5 min)
      const token = jwt.sign({ userId: user.id, type: "password-reset" }, Env.JWT_SECRET!, { expiresIn: "5m" });
      return res.json({ token });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      console.error("verifyResetCode error:", error);
      return res.status(500).json({ message: "Erro ao verificar código" });
    }
  }

  async resetPassword(req: Request, res: Response) {
    const bodySchema = z.object({ token: z.string().min(10), password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres") });
    try {
      const { token, password } = bodySchema.parse(req.body);
      let payload: { userId: string; type: string };
      try {
        payload = jwt.verify(token, Env.JWT_SECRET!) as typeof payload;
      } catch {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }
      if (payload.type !== "password-reset") return res.status(400).json({ message: "Token inválido" });
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
      const hashed = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed, resetCode: null, resetCodeExpiresAt: null, resetCodeAttempts: 0 },
      });
      return res.json({ message: "Senha redefinida com sucesso" });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Dados inválidos", errors: error.issues });
      console.error("resetPassword error:", error);
      return res.status(500).json({ message: "Erro ao redefinir senha" });
    }
  }
}
