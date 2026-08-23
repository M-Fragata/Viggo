import { Router } from 'express';
import { AuthController } from '../controller/AuthController.js';
import { ForgotPasswordController } from '../controller/ForgotPasswordController.js';
import { authMiddleware } from '../middleware/AuthMiddleware.js';
import { authLimiter } from '../middleware/RateLimitMiddleware.js';

const authController = new AuthController();
const forgotPasswordController = new ForgotPasswordController();
const authRoutes = Router();

authRoutes.get('/me', authMiddleware, authController.me);
authRoutes.post('/change-password', authMiddleware, (req, res) => authController.changePassword(req, res));
authRoutes.post('/forgot-password', authLimiter, (req, res) => forgotPasswordController.forgotPassword(req, res));
authRoutes.post('/verify-reset-code', authLimiter, (req, res) => forgotPasswordController.verifyResetCode(req, res));
authRoutes.post('/reset-password', authLimiter, (req, res) => forgotPasswordController.resetPassword(req, res));

export { authRoutes };
