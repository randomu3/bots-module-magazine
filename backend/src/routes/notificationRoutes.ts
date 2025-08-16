import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// User notification routes
router.get('/', NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.put('/:id/read', NotificationController.markAsRead);
router.put('/mark-all-read', NotificationController.markAllAsRead);

// Notification preferences
router.get('/preferences', NotificationController.getPreferences);
router.put('/preferences', NotificationController.updatePreferences);

// Admin broadcast routes
router.post('/broadcasts', NotificationController.createBroadcast);
router.post('/broadcasts/:id/send', NotificationController.sendBroadcast);
router.get('/broadcasts', NotificationController.getBroadcasts);

// Test notification (admin only)
router.post('/test', NotificationController.testNotification);

export default router;