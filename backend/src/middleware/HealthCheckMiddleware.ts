import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/prisma.js';

let isReady = false;

export function setReady(ready: boolean) {
  isReady = ready;
}

export function healthCheck(req: Request, res: Response) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
  });
}

export async function readinessCheck(req: Request, res: Response) {
  if (!isReady) {
    return res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      reason: 'Service not ready',
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export function healthCheckMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') {
    return healthCheck(req, res);
  }
  if (req.path === '/ready') {
    return readinessCheck(req, res);
  }
  next();
}