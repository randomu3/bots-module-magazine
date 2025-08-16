import { Router } from 'express';
import { SubscriberController } from '../controllers/subscriberController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Bot subscriber management
router.get('/bots/:botId/subscribers', SubscriberController.getBotSubscribers);
router.get('/bots/:botId/subscribers/stats', SubscriberController.getBotSubscriberStats);
router.get('/bots/:botId/subscribers/chat-ids', SubscriberController.getActiveChatIds);

router.post('/bots/:botId/subscribers', SubscriberController.addSubscriber);
router.put('/bots/:botId/subscribers/:subscriberId', SubscriberController.updateSubscriber);
router.delete('/bots/:botId/subscribers/:subscriberId', SubscriberController.deactivateSubscriber);

// Bulk operations
router.post('/bots/:botId/subscribers/bulk-deactivate', SubscriberController.bulkDeactivateSubscribers);
router.post('/bots/:botId/subscribers/import', SubscriberController.importSubscribers);

export default router;