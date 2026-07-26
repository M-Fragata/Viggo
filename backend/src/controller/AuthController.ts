import type { Request, Response } from 'express';
import { prisma } from '../database/prisma.js';
import { hasFaceDescriptor } from '../utils/faceEncryption.js';

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
}
