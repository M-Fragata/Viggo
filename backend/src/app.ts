import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { routes } from './routes/index.js';
import { loggingMiddleware } from './middleware/LoggingMiddleware.js';
import { generalApiLimiter } from './middleware/RateLimitMiddleware.js';
import { healthCheck, readinessCheck, setReady } from './middleware/HealthCheckMiddleware.js';
import { auditMiddleware } from './middleware/AuditMiddleware.js';

import { Env } from "./utils/environment.js"
import { devRoutes } from "./routes/devRoutes.js";

const app = express();

app.use(cors({
  origin: Env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
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
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
    },
  },
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(loggingMiddleware);
app.use(generalApiLimiter);
app.get('/health', healthCheck);
app.get('/ready', readinessCheck);

// Global audit middleware — runs before routes so it can intercept all responses.
// req.user is populated per-route by authMiddleware; the audit log is only written
// when req.user is present at response time (checked inside res.json override).
app.use(auditMiddleware);

if (Env.NODE_ENV !== "PROD") {
  app.use("/dev", devRoutes);
}

app.use(routes);

setReady(true);

export { app }