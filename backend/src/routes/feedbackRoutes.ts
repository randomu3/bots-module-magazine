import { Router } from 'express';
import { FeedbackController } from '../controllers/feedbackController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// User feedback routes - accessible by authenticated users
router.post('/feedback', FeedbackController.createFeedback);
router.get('/feedback/my', FeedbackController.getUserFeedback);
router.get('/feedback/:id', FeedbackController.getFeedback);

// Support quality rating routes - accessible by authenticated users
router.post('/support-quality-rating', FeedbackController.createSupportQualityRating);

// Admin feedback routes - accessible by administrators only
router.get('/feedback', FeedbackController.listFeedback);
router.put('/feedback/:id', FeedbackController.updateFeedback);
router.delete('/feedback/:id', FeedbackController.deleteFeedback);
router.get('/feedback-stats', FeedbackController.getFeedbackStats);
router.get('/feedback-attention', FeedbackController.getFeedbackRequiringAttention);
router.get('/support-quality-stats', FeedbackController.getSupportQualityStats);

export default router;