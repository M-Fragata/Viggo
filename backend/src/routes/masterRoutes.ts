import { Router } from 'express';
import { MasterController } from '../controller/master/MasterController.js';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { requireMaster } from '../middleware/RoleGuard.js';
import { impersonateRateLimit } from '../middleware/RateLimitMiddleware.js';

const masterRoutes = Router();
const masterController = new MasterController();

masterRoutes.use(authMiddleware);
masterRoutes.use(requireMaster);

masterRoutes.get('/companies', masterController.listCompanies);
masterRoutes.get('/companies/export', masterController.exportCompaniesCsv);
masterRoutes.get('/companies/:id', masterController.getCompanyDetails);
masterRoutes.get('/metrics', masterController.getMetrics);
masterRoutes.get('/audit-logs', masterController.listAuditLogs);
masterRoutes.put('/companies/:id/plan', masterController.updateCompanyPlan);
masterRoutes.put('/companies/:id/status', masterController.updateCompanyStatus);
masterRoutes.post('/companies/:id/extend-trial', masterController.extendTrial);
masterRoutes.post('/companies/:id/impersonate', impersonateRateLimit, masterController.impersonate);

export { masterRoutes };
