import express from 'express';
import { ReferralController } from '../controllers/referralController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/program-info', ReferralController.getReferralProgramInfo);
router.get('/validate/:code', ReferralController.validateReferralCode);
router.get('/leaderboard', ReferralController.getTopReferrers);

// Protected routes (require authentication)
router.use(authenticateToken);

// User referral routes
router.get('/my-code', ReferralController.getReferralCode);
router.get('/my-stats', ReferralController.getReferralStats);
router.get('/my-referrals', ReferralController.getReferralList);
router.get('/dashboard', ReferralController.getReferralDashboard);

// Admin routes
router.post('/process-commission', ReferralController.processReferralCommission);

export default router;