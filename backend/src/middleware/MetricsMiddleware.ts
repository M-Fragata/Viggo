import type { Request, Response, NextFunction } from 'express';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

const register = new Registry();

collectDefaultMetrics({ register, prefix: 'viggo_' });

export const httpRequestsTotal = new Counter({
  name: 'viggo_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'viggo_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const activeUsers = new Gauge({
  name: 'viggo_active_users',
  help: 'Number of active users',
  registers: [register],
});

export const checkinsTotal = new Counter({
  name: 'viggo_checkins_total',
  help: 'Total number of check-ins',
  labelNames: ['type', 'company_id'],
  registers: [register],
});

export const faceValidationsTotal = new Counter({
  name: 'viggo_face_validations_total',
  help: 'Total number of face validations',
  labelNames: ['result', 'company_id'],
  registers: [register],
});

export const dbQueriesTotal = new Counter({
  name: 'viggo_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'model', 'status'],
  registers: [register],
});

export const dbQueryDuration = new Histogram({
  name: 'viggo_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const route = req.route?.path || req.path;

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode;

    httpRequestsTotal.inc({ method: req.method, route, status_code: statusCode });
    httpRequestDuration.observe({ method: req.method, route, status_code: statusCode }, duration);
  });

  next();
}

export async function metricsEndpoint(req: Request, res: Response) {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error generating metrics');
  }
}

export { register };