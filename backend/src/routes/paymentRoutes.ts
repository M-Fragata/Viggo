import { Router } from 'express';
import { PaymentController } from '../controller/payment/PaymentController.js';
import { authMiddleware } from '../middleware/AuthMiddleware.js';

const paymentRoutes = Router();
const paymentController = new PaymentController();

// Rotas autenticadas
paymentRoutes.post('/checkout', authMiddleware, (req, res) => paymentController.createCheckout(req, res));
paymentRoutes.get('/history', authMiddleware, (req, res) => paymentController.getPaymentHistory(req, res));
paymentRoutes.post('/cancel', authMiddleware, (req, res) => paymentController.cancelSubscription(req, res));
paymentRoutes.post('/retry', authMiddleware, (req, res) => paymentController.retryPayment(req, res));

// Webhook (sem auth — validado por token próprio)
paymentRoutes.post('/webhook', (req, res) => paymentController.handleWebhook(req, res));

export { paymentRoutes };
