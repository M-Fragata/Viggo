import pino from 'pino';
import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

const isDevelopment = process.env.NODE_ENV !== 'production';

const prettyTransport = isDevelopment ? {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
} : undefined;

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: prettyTransport as any,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  const start = Date.now();

  const logInfo = {
    correlationId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    companyId: req.user?.companyId,
  };

  logger.info(logInfo, 'Request started');

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel]({
      ...logInfo,
      statusCode: res.statusCode,
      durationMs: duration,
    }, 'Request completed');
  });

  next();
}

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export function getChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}