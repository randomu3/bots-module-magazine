import express from 'express';
import { WithdrawalController } from '../controllers/withdrawalController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// User withdrawal routes
router.get('/limits', WithdrawalController.getWithdrawalLimits);
router.post('/check-eligibility', WithdrawalController.checkWithdrawalEligibility);
router.post('/request', WithdrawalController.createWithdrawalRequest);
router.get('/history', WithdrawalController.getWithdrawalHistory);
router.put('/:id/cancel', WithdrawalController.cancelWithdrawal);
router.get('/stats', WithdrawalController.getWithdrawalStats);

// Admin withdrawal routes
router.get('/pending', WithdrawalController.getPendingWithdrawals);
router.put('/:id/process', WithdrawalController.processWithdrawal);

export default router;