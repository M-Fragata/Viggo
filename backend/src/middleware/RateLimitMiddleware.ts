import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip ?? 'unknown',
});

export const checkinLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Limite de batidas de ponto excedido. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'unknown',
});

export const faceValidationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { message: 'Muitas validações faciais. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'unknown',
});

export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: 'Muitas requisições. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'unknown',
});