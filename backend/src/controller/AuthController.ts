import type { Request, Response } from 'express';
import { prisma } from '../database/prisma.js';
import { hasFaceDescriptor } from '../utils/faceEncryption.js';
import { z } from 'zod';
import bcrypt from 'bcrypt';

export class AuthController {
  async me(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Usuário não identificado' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          createdAt: true,
          faceDescriptor: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          createdAt: user.createdAt,
          hasFaceDescriptor: hasFaceDescriptor(user.faceDescriptor as string | null),
        },
      });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return res.status(500).json({ message: 'Erro ao buscar dados do usuário' });
    }
  }

  /**
   * POST /auth/change-password
   * Altera a senha do usuário autenticado (usado para definir a senha definitiva).
   */
  async changePassword(req: Request, res: Response) {
    const bodySchema = z.object({
      newPassword: z
        .string()
        .min(8, 'A nova senha deve conter no mínimo 8 caracteres')
        .refine(
          (pwd) => !pwd.toLowerCase().endsWith('@viggo') && !pwd.toLowerCase().endsWith('viggo'),
          { message: 'A sua senha pessoal definitiva não pode terminar com @viggo' }
        ),
    });

    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Não autenticado' });
      }

      const { newPassword } = bodySchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return res.json({ message: 'Senha atualizada com sucesso!' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.issues[0]?.message || 'Dados inválidos', errors: error.issues });
      }
      console.error('Erro ao alterar senha:', error);
      return res.status(500).json({ message: 'Erro ao alterar senha' });
    }
  }
}
