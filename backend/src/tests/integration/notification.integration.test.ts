import '../integration-setup';
import request from 'supertest';
import app from '../../index';
import { UserModel } from '../../models/User';
import { EmailVerificationTokenModel } from '../../models/EmailVerificationToken';
import { NotificationService } from '../../services/notificationService';
import { EmailService } from '../../services/emailService';

// Mock services
jest.mock('../../services/notificationService');
jest.mock('../../services/emailService');

const mockNotificationService = NotificationService as jest.Mocked<typeof NotificationService>;
const mockEmailService = EmailService as jest.Mocked<typeof EmailService>;

describe('Notification Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    // Create regular test user
    const userData = {
      email: `notificationtest-${Date.now()}@example.com`,
      password: 'testpassword123',
      first_name: 'Notification',
      last_name: 'Tester'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    userId = registerResponse.body.user.id;

    // Verify email
    const verificationTokens = await EmailVerificationTokenModel.findByUserId(userId);
    await request(app)
      .post('/api/auth/verify-email')
      .send({ token: verificationTokens[0]?.token });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    authToken = loginResponse.body.tokens.accessToken;

    // Create admin user
    const adminData = {
      email: `admin-notification-${Date.now()}@example.com`,
      password: 'adminpassword123',
      first_name: 'Admin',
      last_name: 'Notification',
      role: 'admin'
    };

    const adminRegisterResponse = await request(app)
      .post('/api/auth/register')
      .send(adminData);

    adminUserId = adminRegisterResponse.body.user.id;

    // Verify admin email
    const adminVerificationTokens = await EmailVerificationTokenModel.findByUserId(adminUserId);
    await request(app)
      .post('/api/auth/verify-email')
      .send({ token: adminVerificationTokens[0]?.token });

    // Login admin
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminData.email,
        password: adminData.password
      });

    adminToken = adminLoginResponse.body.tokens.accessToken;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);
    mockEmailService.verifyEmailConfig.mockResolvedValue(true);
    mockNotificationService.createNotification.mockResolvedValue({
      id: 'notification-123',
      user_id: userId,
      type: 'info',
      title: 'Test Notification',
      message: 'Test message',
      read: false,
      created_at: new Date()
    });
  });

  describe('User Notifications', () => {
    describe('GET /api/notifications', () => {
      it('should get user notifications', async () => {
        const response = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('notifications');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body).toHaveProperty('unread_count');
        expect(Array.isArray(response.body.notifications)).toBe(true);
      });

      it('should filter notifications by read status', async () => {
        const response = await request(app)
          .get('/api/notifications?read=false')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.notifications).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              read: false
            })
          ])
        );
      });

      it('should filter notifications by type', async () => {
        const response = await request(app)
          .get('/api/notifications?type=payment')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.notifications).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'payment'
            })
          ])
        );
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/notifications?page=1&limit=10')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.pagination).toMatchObject({
          page: 1,
          limit: 10,
          total: expect.any(Number),
          pages: expect.any(Number)
        });
      });
    });

    describe('PUT /api/notifications/:id/read', () => {
      it('should mark notification as read', async () => {
        mockNotificationService.markAsRead.mockResolvedValueOnce({
          id: 'notification-123',
          user_id: userId,
          read: true,
          read_at: new Date()
        });

        const response = await request(app)
          .put('/api/notifications/notification-123/read')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Notification marked as read');
        expect(response.body.notification.read).toBe(true);

        expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(
          'notification-123',
          userId
        );
      });

      it('should return 404 for non-existent notification', async () => {
        mockNotificationService.markAsRead.mockRejectedValueOnce(
          new Error('Notification not found')
        );

        const response = await request(app)
          .put('/api/notifications/non-existent/read')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
      });
    });

    describe('PUT /api/notifications/mark-all-read', () => {
      it('should mark all notifications as read', async () => {
        mockNotificationService.markAllAsRead.mockResolvedValueOnce({
          updated_count: 5
        });

        const response = await request(app)
          .put('/api/notifications/mark-all-read')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('All notifications marked as read');
        expect(response.body.updated_count).toBe(5);

        expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith(userId);
      });
    });

    describe('DELETE /api/notifications/:id', () => {
      it('should delete notification', async () => {
        mockNotificationService.deleteNotification.mockResolvedValueOnce(true);

        const response = await request(app)
          .delete('/api/notifications/notification-123')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Notification deleted successfully');

        expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith(
          'notification-123',
          userId
        );
      });
    });

    describe('GET /api/notifications/preferences', () => {
      it('should get notification preferences', async () => {
        const response = await request(app)
          .get('/api/notifications/preferences')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('email_notifications');
        expect(response.body).toHaveProperty('push_notifications');
        expect(response.body).toHaveProperty('notification_types');
        expect(response.body).toHaveProperty('frequency_settings');
      });
    });

    describe('PUT /api/notifications/preferences', () => {
      it('should update notification preferences', async () => {
        const preferences = {
          email_notifications: true,
          push_notifications: false,
          notification_types: {
            payment: true,
            module_updates: false,
            system_alerts: true,
            marketing: false
          },
          frequency_settings: {
            digest_frequency: 'weekly',
            immediate_alerts: ['payment', 'security']
          }
        };

        const response = await request(app)
          .put('/api/notifications/preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send(preferences);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Notification preferences updated');
        expect(response.body.preferences).toMatchObject(preferences);
      });

      it('should validate preference data', async () => {
        const response = await request(app)
          .put('/api/notifications/preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            email_notifications: 'invalid_boolean',
            notification_types: {
              invalid_type: true
            }
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('System Notifications', () => {
    describe('POST /api/notifications/system', () => {
      it('should create system notification (admin only)', async () => {
        mockNotificationService.createSystemNotification.mockResolvedValueOnce({
          id: 'system-notification-123',
          type: 'system',
          title: 'System Maintenance',
          message: 'Scheduled maintenance tonight',
          target_users: 'all',
          created_at: new Date()
        });

        const response = await request(app)
          .post('/api/notifications/system')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'System Maintenance',
            message: 'Scheduled maintenance tonight from 2-4 AM UTC',
            type: 'system',
            target_users: 'all',
            priority: 'high'
          });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('System notification created successfully');
        expect(response.body.notification).toMatchObject({
          title: 'System Maintenance',
          type: 'system'
        });
      });

      it('should reject non-admin access', async () => {
        const response = await request(app)
          .post('/api/notifications/system')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test',
            message: 'Test message',
            type: 'system'
          });

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });

      it('should validate system notification data', async () => {
        const response = await request(app)
          .post('/api/notifications/system')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            message: 'Missing title',
            type: 'system'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /api/notifications/broadcast', () => {
      it('should send broadcast notification', async () => {
        mockNotificationService.sendBroadcast.mockResolvedValueOnce({
          broadcast_id: 'broadcast-123',
          total_recipients: 150,
          successful_sends: 148,
          failed_sends: 2,
          created_at: new Date()
        });

        const response = await request(app)
          .post('/api/notifications/broadcast')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'New Feature Announcement',
            message: 'We have launched a new analytics dashboard!',
            type: 'announcement',
            target_audience: {
              user_roles: ['user', 'developer'],
              active_since: '2024-01-01'
            },
            channels: ['email', 'in_app']
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Broadcast sent successfully');
        expect(response.body.result).toMatchObject({
          total_recipients: 150,
          successful_sends: 148,
          failed_sends: 2
        });
      });

      it('should validate broadcast data', async () => {
        const response = await request(app)
          .post('/api/notifications/broadcast')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: '',
            message: 'Test message'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Email Notifications', () => {
    describe('POST /api/notifications/email/send', () => {
      it('should send individual email notification', async () => {
        mockEmailService.sendNotificationEmail.mockResolvedValueOnce({
          message_id: 'email-123',
          status: 'sent'
        });

        const response = await request(app)
          .post('/api/notifications/email/send')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            recipient_id: userId,
            subject: 'Account Update',
            template: 'account_update',
            data: {
              user_name: 'Notification Tester',
              update_type: 'Profile Information'
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Email sent successfully');
        expect(response.body.email_id).toBeDefined();

        expect(mockEmailService.sendNotificationEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            recipient_id: userId,
            subject: 'Account Update',
            template: 'account_update'
          })
        );
      });

      it('should handle email sending failures', async () => {
        mockEmailService.sendNotificationEmail.mockRejectedValueOnce(
          new Error('SMTP server unavailable')
        );

        const response = await request(app)
          .post('/api/notifications/email/send')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            recipient_id: userId,
            subject: 'Test Email',
            template: 'generic',
            data: {}
          });

        expect(response.status).toBe(500);
        expect(response.body.error.code).toBe('EMAIL_SEND_FAILED');
      });
    });

    describe('GET /api/notifications/email/templates', () => {
      it('should get available email templates', async () => {
        const response = await request(app)
          .get('/api/notifications/email/templates')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('templates');
        expect(Array.isArray(response.body.templates)).toBe(true);
        expect(response.body.templates).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              description: expect.any(String),
              variables: expect.any(Array)
            })
          ])
        );
      });
    });

    describe('POST /api/notifications/email/test', () => {
      it('should send test email', async () => {
        mockEmailService.sendTestEmail.mockResolvedValueOnce({
          message_id: 'test-email-123',
          status: 'sent'
        });

        const response = await request(app)
          .post('/api/notifications/email/test')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            recipient_email: 'test@example.com',
            template: 'welcome',
            test_data: {
              user_name: 'Test User',
              platform_name: 'TeleBotics'
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Test email sent successfully');
      });
    });
  });

  describe('Push Notifications', () => {
    describe('POST /api/notifications/push/subscribe', () => {
      it('should subscribe to push notifications', async () => {
        const response = await request(app)
          .post('/api/notifications/push/subscribe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            endpoint: 'https://fcm.googleapis.com/fcm/send/subscription-endpoint',
            keys: {
              p256dh: 'push-key-p256dh',
              auth: 'push-key-auth'
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Push notification subscription created');
        expect(response.body).toHaveProperty('subscription_id');
      });

      it('should validate subscription data', async () => {
        const response = await request(app)
          .post('/api/notifications/push/subscribe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            endpoint: 'invalid-endpoint'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_SUBSCRIPTION_DATA');
      });
    });

    describe('POST /api/notifications/push/send', () => {
      it('should send push notification', async () => {
        mockNotificationService.sendPushNotification.mockResolvedValueOnce({
          notification_id: 'push-123',
          status: 'sent',
          delivered_to: 1
        });

        const response = await request(app)
          .post('/api/notifications/push/send')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            user_id: userId,
            title: 'New Message',
            body: 'You have received a new message',
            icon: '/icons/message.png',
            badge: '/icons/badge.png',
            data: {
              url: '/messages',
              action: 'view_message'
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Push notification sent successfully');
      });
    });

    describe('DELETE /api/notifications/push/unsubscribe', () => {
      it('should unsubscribe from push notifications', async () => {
        const response = await request(app)
          .delete('/api/notifications/push/unsubscribe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            subscription_id: 'subscription-123'
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Push notification subscription removed');
      });
    });
  });

  describe('Notification Analytics', () => {
    describe('GET /api/notifications/analytics', () => {
      it('should get notification analytics', async () => {
        const response = await request(app)
          .get('/api/notifications/analytics')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('delivery_stats');
        expect(response.body).toHaveProperty('engagement_metrics');
        expect(response.body).toHaveProperty('channel_performance');
        expect(response.body).toHaveProperty('user_preferences_stats');
      });

      it('should filter analytics by date range', async () => {
        const response = await request(app)
          .get('/api/notifications/analytics?start_date=2024-01-01&end_date=2024-12-31')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('date_range');
        expect(response.body.date_range).toMatchObject({
          start: '2024-01-01',
          end: '2024-12-31'
        });
      });

      it('should filter analytics by notification type', async () => {
        const response = await request(app)
          .get('/api/notifications/analytics?type=payment')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('notification_type');
        expect(response.body.notification_type).toBe('payment');
      });
    });

    describe('GET /api/notifications/analytics/delivery-rates', () => {
      it('should get delivery rate analytics', async () => {
        const response = await request(app)
          .get('/api/notifications/analytics/delivery-rates')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('overall_delivery_rate');
        expect(response.body).toHaveProperty('delivery_by_channel');
        expect(response.body).toHaveProperty('failed_deliveries');
        expect(response.body).toHaveProperty('bounce_rates');
      });
    });

    describe('GET /api/notifications/analytics/engagement', () => {
      it('should get engagement analytics', async () => {
        const response = await request(app)
          .get('/api/notifications/analytics/engagement')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('open_rates');
        expect(response.body).toHaveProperty('click_through_rates');
        expect(response.body).toHaveProperty('action_completion_rates');
        expect(response.body).toHaveProperty('user_engagement_trends');
      });
    });
  });

  describe('Notification Queue Management', () => {
    describe('GET /api/notifications/queue/status', () => {
      it('should get notification queue status', async () => {
        const response = await request(app)
          .get('/api/notifications/queue/status')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('queue_size');
        expect(response.body).toHaveProperty('processing_rate');
        expect(response.body).toHaveProperty('failed_notifications');
        expect(response.body).toHaveProperty('retry_queue_size');
      });
    });

    describe('POST /api/notifications/queue/retry-failed', () => {
      it('should retry failed notifications', async () => {
        const response = await request(app)
          .post('/api/notifications/queue/retry-failed')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            notification_ids: ['failed-1', 'failed-2'],
            retry_strategy: 'immediate'
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Failed notifications queued for retry');
        expect(response.body).toHaveProperty('retry_count');
      });
    });

    describe('DELETE /api/notifications/queue/clear-failed', () => {
      it('should clear failed notifications', async () => {
        const response = await request(app)
          .delete('/api/notifications/queue/clear-failed')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Failed notifications cleared');
        expect(response.body).toHaveProperty('cleared_count');
      });
    });
  });
});