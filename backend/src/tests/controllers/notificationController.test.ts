import request from 'supertest';
import app from '../../index';
import { NotificationService } from '../../services/notificationService';
import { NotificationModel } from '../../models/Notification';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../services/notificationService');
jest.mock('../../models/Notification');

const mockNotificationService = NotificationService as jest.Mocked<typeof NotificationService>;
const mockNotificationModel = NotificationModel as jest.Mocked<typeof NotificationModel>;

describe('NotificationController', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'user'
  };

  const mockAdminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'admin'
  };

  let userToken: string;
  let adminToken: string;

  beforeAll(() => {
    const JWT_SECRET = process.env['JWT_SECRET'] || 'test-secret';
    userToken = jwt.sign(mockUser, JWT_SECRET);
    adminToken = jwt.sign(mockAdminUser, JWT_SECRET);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('should get user notifications', async () => {
      const mockNotifications = [
        {
          id: 'notification-1',
          user_id: 'user-1',
          type: 'payment_received' as const,
          title: 'Payment Received',
          message: 'Your payment has been processed',
          status: 'sent' as const,
          email_sent: true,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockNotificationService.getUserNotifications.mockResolvedValue(mockNotifications);

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.notifications).toEqual(mockNotifications);
      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('user-1', {
        limit: 20,
        offset: 0
      });
    });

    it('should handle pagination parameters', async () => {
      mockNotificationService.getUserNotifications.mockResolvedValue([]);

      await request(app)
        .get('/api/notifications?page=2&limit=10&type=payment_received')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('user-1', {
        type: 'payment_received',
        limit: 10,
        offset: 10
      });
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/notifications')
        .expect(401);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should get unread notification count', async () => {
      mockNotificationService.getUnreadCount.mockResolvedValue(5);

      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.unread_count).toBe(5);
      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith('user-1');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/notifications/unread-count')
        .expect(401);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const mockNotification = {
        id: 'notification-1',
        user_id: 'user-1',
        type: 'payment_received' as const,
        title: 'Payment Received',
        message: 'Your payment has been processed',
        status: 'read' as const,
        email_sent: true,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockNotificationModel.findById.mockResolvedValue(mockNotification);
      mockNotificationService.markAsRead.mockResolvedValue();

      const response = await request(app)
        .put('/api/notifications/notification-1/read')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.message).toBe('Notification marked as read');
      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('notification-1');
    });

    it('should return 404 for non-existent notification', async () => {
      mockNotificationModel.findById.mockResolvedValue(null);

      await request(app)
        .put('/api/notifications/non-existent/read')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should return 403 for notification belonging to another user', async () => {
      const mockNotification = {
        id: 'notification-1',
        user_id: 'other-user',
        type: 'payment_received' as const,
        title: 'Payment Received',
        message: 'Your payment has been processed',
        status: 'sent' as const,
        email_sent: true,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockNotificationModel.findById.mockResolvedValue(mockNotification);

      await request(app)
        .put('/api/notifications/notification-1/read')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/notifications/mark-all-read', () => {
    it('should mark all notifications as read', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue(3);

      const response = await request(app)
        .put('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.message).toBe('3 notifications marked as read');
      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GET /api/notifications/preferences', () => {
    it('should get notification preferences', async () => {
      const mockPreferences = {
        email_notifications: true,
        payment_notifications: true,
        withdrawal_notifications: true,
        module_notifications: true,
        referral_notifications: true,
        system_notifications: true,
        support_notifications: true
      };

      mockNotificationService.getNotificationPreferences.mockResolvedValue(mockPreferences);

      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.preferences).toEqual(mockPreferences);
      expect(mockNotificationService.getNotificationPreferences).toHaveBeenCalledWith('user-1');
    });
  });

  describe('PUT /api/notifications/preferences', () => {
    it('should update notification preferences', async () => {
      const updatedPreferences = {
        email_notifications: true,
        payment_notifications: false,
        withdrawal_notifications: true,
        module_notifications: true,
        referral_notifications: true,
        system_notifications: true,
        support_notifications: true
      };

      mockNotificationService.updateNotificationPreferences.mockResolvedValue(updatedPreferences);

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ payment_notifications: false })
        .expect(200);

      expect(response.body.message).toBe('Notification preferences updated');
      expect(response.body.preferences).toEqual(updatedPreferences);
      expect(mockNotificationService.updateNotificationPreferences).toHaveBeenCalledWith('user-1', {
        payment_notifications: false
      });
    });
  });

  describe('POST /api/notifications/broadcasts', () => {
    it('should create broadcast (admin only)', async () => {
      const mockBroadcast = {
        id: 'broadcast-1',
        title: 'System Maintenance',
        message: 'Scheduled maintenance tonight',
        type: 'system_announcement' as const,
        target_audience: { all: true },
        status: 'draft',
        total_recipients: 0,
        successful_sends: 0,
        failed_sends: 0,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockNotificationService.createBroadcast.mockResolvedValue(mockBroadcast);

      const response = await request(app)
        .post('/api/notifications/broadcasts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'System Maintenance',
          message: 'Scheduled maintenance tonight',
          type: 'system_announcement'
        })
        .expect(201);

      expect(response.body.message).toBe('Broadcast created successfully');
      expect(response.body.broadcast).toEqual(mockBroadcast);
    });

    it('should require admin role', async () => {
      await request(app)
        .post('/api/notifications/broadcasts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'System Maintenance',
          message: 'Scheduled maintenance tonight'
        })
        .expect(403);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/notifications/broadcasts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/notifications/broadcasts/:id/send', () => {
    it('should send broadcast (admin only)', async () => {
      mockNotificationService.sendBroadcast.mockResolvedValue();

      const response = await request(app)
        .post('/api/notifications/broadcasts/broadcast-1/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Broadcast sent successfully');
      expect(mockNotificationService.sendBroadcast).toHaveBeenCalledWith('broadcast-1');
    });

    it('should require admin role', async () => {
      await request(app)
        .post('/api/notifications/broadcasts/broadcast-1/send')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/notifications/broadcasts', () => {
    it('should get broadcasts (admin only)', async () => {
      const mockBroadcasts = [
        {
          id: 'broadcast-1',
          title: 'System Maintenance',
          message: 'Scheduled maintenance tonight',
          type: 'system_announcement' as const,
          target_audience: { all: true },
          status: 'sent',
          total_recipients: 100,
          successful_sends: 95,
          failed_sends: 5,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockNotificationModel.listBroadcasts.mockResolvedValue(mockBroadcasts);

      const response = await request(app)
        .get('/api/notifications/broadcasts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.broadcasts).toEqual(mockBroadcasts);
    });

    it('should require admin role', async () => {
      await request(app)
        .get('/api/notifications/broadcasts')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /api/notifications/test', () => {
    it('should send test notification (admin only)', async () => {
      mockNotificationService.sendNotification.mockResolvedValue();

      const response = await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'payment_received',
          target_user_id: 'user-1',
          data: { amount: 100, currency: 'USD', description: 'Test payment' }
        })
        .expect(200);

      expect(response.body.message).toBe('Test notification sent successfully');
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        'user-1',
        'payment_received',
        'Test payment_received notification',
        'This is a test notification of type payment_received',
        { amount: 100, currency: 'USD', description: 'Test payment' }
      );
    });

    it('should require admin role', async () => {
      await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'payment_received',
          target_user_id: 'user-1'
        })
        .expect(403);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
  });
});