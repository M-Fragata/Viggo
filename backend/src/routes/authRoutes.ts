import { Router } from 'express';
import { AuthController } from '../controller/AuthController.js';
import { authMiddleware } from '../middleware/AuthMiddleware.js';

const authController = new AuthController();
const authRoutes = Router();

authRoutes.get('/me', authMiddleware, authController.me);

export { authRoutes };
