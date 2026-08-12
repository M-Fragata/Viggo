import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

const isTest = process.env.NODE_ENV === 'TEST';

function noopMiddleware(_req: Request, _res: Response, next: NextFunction) {
  next();
}

function createLimiter(opts: Parameters<typeof rateLimit>[0]) {
  if (isTest) return noopMiddleware;
  return rateLimit(opts);
}

export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip ?? 'unknown',
});

export const checkinLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Limite de batidas de ponto excedido. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'unknown',
});

export const faceValidationLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { message: 'Muitas validações faciais. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'unknown',
});

export const generalApiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: 'Muitas requisições. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'unknown',
});

export const impersonateRateLimit = createLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: 'Muitas tentativas de impersonação. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip ?? 'unknown',
});

export const signupLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Muitas tentativas de criação de conta. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip ?? 'unknown',
});
