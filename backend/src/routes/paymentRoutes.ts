import express from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes (webhooks)
router.post('/webhook', express.raw({ type: 'application/json' }), PaymentController.handleWebhook);

// Protected routes (require authentication)
router.use(authenticateToken);

// User payment routes
router.post('/create', PaymentController.createPayment);
router.get('/history', PaymentController.getPaymentHistory);
router.get('/balance', PaymentController.getBalance);
router.get('/transactions/:id', PaymentController.getTransaction);

// Admin routes
router.post('/refund', PaymentController.createRefund);
router.get('/stats', PaymentController.getPaymentStats);

export default router;