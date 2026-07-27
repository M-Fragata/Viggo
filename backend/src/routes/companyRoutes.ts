import { Router } from 'express';
import { CompanyController } from '../controller/company/CompanyController.js';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { requireEnterpriseAdmin } from '../middleware/RoleGuard.js';
import { planMiddleware, requireEmployeeLimit } from '../middleware/PlanMiddleware.js';
import { signupLimiter } from '../middleware/RateLimitMiddleware.js';

const companyRoutes = Router();
const companyController = new CompanyController();

// Public routes
companyRoutes.post('/signup', signupLimiter, companyController.signup);
companyRoutes.get('/invites/:token', companyController.getInviteByToken);
companyRoutes.post('/invites/accept', companyController.acceptInvite);

// Protected routes (require auth + company context)
companyRoutes.use(authMiddleware);
companyRoutes.use(planMiddleware);

companyRoutes.get('/me', companyController.getMe);
companyRoutes.put('/me', requireEnterpriseAdmin, companyController.updateMe);
companyRoutes.get('/me/usage', companyController.getUsage);

// Invite Tokens (require admin + employee limit check)
companyRoutes.post('/me/invite-token', requireEnterpriseAdmin, requireEmployeeLimit, companyController.createInviteToken);
companyRoutes.get('/me/invite-tokens', requireEnterpriseAdmin, companyController.listInviteTokens);
companyRoutes.delete('/me/invite-tokens/:id', requireEnterpriseAdmin, companyController.revokeInviteToken);

export { companyRoutes };
