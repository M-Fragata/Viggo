import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { routes } from './routes/index.js';
import { loggingMiddleware } from './middleware/LoggingMiddleware.js';
import { generalApiLimiter } from './middleware/RateLimitMiddleware.js';
import { metricsMiddleware, metricsEndpoint } from './middleware/MetricsMiddleware.js';
import { healthCheck, readinessCheck, setReady } from './middleware/HealthCheckMiddleware.js';

import { Env } from "./utils/environment.js"

const app = express();

app.use(cors({
  origin: Env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

app.use(express.json());
app.use(loggingMiddleware);
app.use(generalApiLimiter);
app.use(metricsMiddleware);

app.get('/health', healthCheck);
app.get('/ready', readinessCheck);

app.use(routes);

app.get('/metrics', metricsEndpoint);

setReady(true);

export { app }