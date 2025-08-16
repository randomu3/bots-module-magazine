import express from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// All analytics routes require authentication
router.use(authenticateToken);

// User analytics routes
router.get('/revenue', AnalyticsController.getUserRevenueStats);
router.get('/bots', AnalyticsController.getUserBotAnalytics);
router.get('/period', AnalyticsController.getPeriodStats);
router.get('/modules', AnalyticsController.getModuleAnalytics);
router.get('/export', AnalyticsController.exportAnalytics);

// Admin analytics routes
router.get('/admin/platform', AnalyticsController.getPlatformStats);
router.get('/admin/users', AnalyticsController.getUserActivityReport);
router.get('/admin/financial', AnalyticsController.getFinancialReport);

export default router;