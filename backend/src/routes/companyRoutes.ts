import { Router } from 'express';
import { CompanyController } from '../modules/company/CompanyController.js';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { requireEnterpriseAdmin } from '../middleware/RoleGuard.js';
import { planMiddleware, requireEmployeeLimit } from '../middleware/PlanMiddleware.js';

const companyRoutes = Router();
const companyController = new CompanyController();

// Public routes
companyRoutes.post('/signup', companyController.signup);
companyRoutes.get('/invites/:token', companyController.getInviteByToken);
companyRoutes.post('/invites/accept', companyController.acceptInvite);

// Protected routes (require auth + company context)
companyRoutes.use(authMiddleware);
companyRoutes.use(planMiddleware);

companyRoutes.get('/me', companyController.getMe);
companyRoutes.put('/me', requireEnterpriseAdmin, companyController.updateMe);
companyRoutes.get('/me/usage', companyController.getUsage);

// Invites (require admin + employee limit check)
companyRoutes.post('/me/invites', requireEnterpriseAdmin, requireEmployeeLimit, companyController.createInvite);
companyRoutes.get('/me/invites', requireEnterpriseAdmin, companyController.listInvites);
companyRoutes.delete('/me/invites/:id', requireEnterpriseAdmin, companyController.cancelInvite);

export { companyRoutes };
