import { NotificationService } from '../../services/notificationService';
import { NotificationModel } from '../../models/Notification';
import { UserModel } from '../../models/User';
import * as emailService from '../../services/emailService';

// Mock dependencies
jest.mock('../../models/Notification');
jest.mock('../../models/User');
jest.mock('../../services/emailService');

const mockNotificationModel = NotificationModel as jest.Mocked<typeof NotificationModel>;
const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockEmailService = emailService as jest.Mocked<typeof emailService>;

describe('NotificationService', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    role: 'user' as const,
    balance: 100,
    email_verified: true,
    theme_preference: 'system' as const,
    created_at: new Date(),
    updated_at: new Date(),
    password_hash: 'hashed'
  };

  const mockNotificationPreferences = {
    email_notifications: true,
    payment_notifications: true,
    withdrawal_notifications: true,
    module_notifications: true,
    referral_notifications: true,
    system_notifications: true,
    support_notifications: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const mockNotification = {
        id: 'notification-1',
        user_id: 'user-1',
        type: 'payment_received' as const,
        title: 'Payment Received',
        message: 'Your payment has been processed',
        status: 'pending' as const,
        email_sent: false,
        metadata: { amount: 100, currency: 'USD' },
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserModel.findById.mockResolvedValue(mockUser);
      mockNotificationModel.getUserNotificationPreferences.mockResolvedValue(mockNotificationPreferences);
      mockNotificationModel.create.mockResolvedValue(mockNotification);
      mockEmailService.sendPaymentReceivedEmail.mockResolvedValue();
      mockNotificationModel.markAsEmailSent.mockResolvedValue(mockNotification);

      await NotificationService.sendNotification(
        'user-1',
        'payment_received',
        'Payment Received',
        'Your payment has been processed',
        { amount: 100, currency: 'USD', description: 'Module purchase' }
      );

      expect(mockUserModel.findById).toHaveBeenCalledWith('user-1');
      expect(mockNotificationModel.getUserNotificationPreferences).toHaveBeenCalledWith('user-1');
      expect(mockNotificationModel.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        type: 'payment_received',
        title: 'Payment Received',
        message: 'Your payment has been processed',
        metadata: { amount: 100, currency: 'USD', description: 'Module purchase' }
      });
      expect(mockEmailService.sendPaymentReceivedEmail).toHaveBeenCalledWith(
        'test@example.com',
        100,
        'USD',
        'Module purchase',
        'John'
      );
      expect(mockNotificationModel.markAsEmailSent).toHaveBeenCalledWith('notification-1');
    });

    it('should skip notification if user preferences disabled', async () => {
      const disabledPreferences = {
        ...mockNotificationPreferences,
        payment_notifications: false
      };

      mockUserModel.findById.mockResolvedValue(mockUser);
      mockNotificationModel.getUserNotificationPreferences.mockResolvedValue(disabledPreferences);

      await NotificationService.sendNotification(
        'user-1',
        'payment_received',
        'Payment Received',
        'Your payment has been processed'
      );

      expect(mockNotificationModel.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendPaymentReceivedEmail).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(
        NotificationService.sendNotification(
          'user-1',
          'payment_received',
          'Payment Received',
          'Your payment has been processed'
        )
      ).rejects.toThrow('User not found');
    });
  });

  describe('sendWelcomeNotification', () => {
    it('should send welcome notification', async () => {
      const mockNotification = {
        id: 'notification-1',
        user_id: 'user-1',
        type: 'welcome' as const,
        title: 'Welcome to TeleBotics Platform!',
        message: 'Your account has been verified and you can now start using our platform.',
        status: 'pending' as const,
        email_sent: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserModel.findById.mockResolvedValue(mockUser);
      mockNotificationModel.getUserNotificationPreferences.mockResolvedValue(mockNotificationPreferences);
      mockNotificationModel.create.mockResolvedValue(mockNotification);
      mockEmailService.sendWelcomeEmail.mockResolvedValue();
      mockNotificationModel.markAsEmailSent.mockResolvedValue(mockNotification);

      await NotificationService.sendWelcomeNotification('user-1');

      expect(mockNotificationModel.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        type: 'welcome',
        title: 'Welcome to TeleBotics Platform!',
        message: 'Your account has been verified and you can now start using our platform.',
        metadata: {}
      });
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith('test@example.com', 'John');
    });
  });

  describe('sendPaymentReceivedNotification', () => {
    it('should send payment received notification', async () => {
      const mockNotification = {
        id: 'notification-1',
        user_id: 'user-1',
        type: 'payment_received' as const,
        title: 'Payment Received',
        message: 'Your payment of 100 USD has been successfully processed.',
        status: 'pending' as const,
        email_sent: false,
        metadata: { amount: 100, currency: 'USD', description: 'Module purchase' },
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserModel.findById.mockResolvedValue(mockUser);
      mockNotificationModel.getUserNotificationPreferences.mockResolvedValue(mockNotificationPreferences);
      mockNotificationModel.create.mockResolvedValue(mockNotification);
      mockEmailService.sendPaymentReceivedEmail.mockResolvedValue();
      mockNotificationModel.markAsEmailSent.mockResolvedValue(mockNotification);

      await NotificationService.sendPaymentReceivedNotification('user-1', 100, 'USD', 'Module purchase');

      expect(mockEmailService.sendPaymentReceivedEmail).toHaveBeenCalledWith(
        'test@example.com',
        100,
        'USD',
        'Module purchase',
        'John'
      );
    });
  });

  describe('sendWithdrawalCompletedNotification', () => {
    it('should send withdrawal completed notification', async () => {
      const mockNotification = {
        id: 'notification-1',
        user_id: 'user-1',
        type: 'withdrawal_completed' as const,
        title: 'Withdrawal Completed',
        message: 'Your withdrawal of 50 USD has been successfully processed.',
        status: 'pending' as const,
        email_sent: false,
        metadata: { amount: 50, currency: 'USD' },
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserModel.findById.mockResolvedValue(mockUser);
      mockNotificationModel.getUserNotificationPreferences.mockResolvedValue(mockNotificationPreferences);
      mockNotificationModel.create.mockResolvedValue(mockNotification);
      mockEmailService.sendWithdrawalCompletedEmail.mockResolvedValue();
      mockNotificationModel.markAsEmailSent.mockResolvedValue(mockNotification);

      await NotificationService.sendWithdrawalCompletedNotification('user-1', 50, 'USD');

      expect(mockEmailService.sendWithdrawalCompletedEmail).toHaveBeenCalledWith(
        'test@example.com',
        50,
        'USD',
        'John'
      );
    });
  });

  describe('sendModuleActivatedNotification', () => {
    it('should send module activated notification', async () => {
      const mockNotification = {
        id: 'notification-1',
        user_id: 'user-1',
        type: 'module_activated' as const,
        title: 'Module Activated',
        message: 'The module "Premium Features" has been activated for your bot "TestBot".',
        status: 'pending' as const,
        email_sent: false,
        metadata: { moduleName: 'Premium Features', botName: 'TestBot' },
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserModel.findById.mockResolvedValue(mockUser);
      mockNotificationModel.getUserNotificationPreferences.mockResolvedValue(mockNotificationPreferences);
      mockNotificationModel.create.mockResolvedValue(mockNotification);
      mockEmailService.sendModuleActivatedEmail.mockResolvedValue();
      mockNotificationModel.markAsEmailSent.mockResolvedValue(mockNotification);

      await NotificationService.sendModuleActivatedNotification('user-1', 'Premium Features', 'TestBot');

      expect(mockEmailService.sendModuleActivatedEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Premium Features',
        'TestBot',
        'John'
      );
    });
  });

  describe('getUserNotifications', () => {
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

      mockNotificationModel.findByUserId.mockResolvedValue(mockNotifications);

      const result = await NotificationService.getUserNotifications('user-1', {
        limit: 10,
        offset: 0
      });

      expect(result).toEqual(mockNotifications);
      expect(mockNotificationModel.findByUserId).toHaveBeenCalledWith('user-1', {
        limit: 10,
        offset: 0
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = {
        id: 'notification-1',
        user_id: 'user-1',
        type: 'payment_received' as const,
        title: 'Payment Received',
        message: 'Your payment has been processed',
        status: 'read' as const,
        email_sent: true,
        read_at: new Date(),
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockNotificationModel.markAsRead.mockResolvedValue(mockNotification);

      await NotificationService.markAsRead('notification-1');

      expect(mockNotificationModel.markAsRead).toHaveBeenCalledWith('notification-1');
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread notification count', async () => {
      mockNotificationModel.getUnreadCount.mockResolvedValue(5);

      const count = await NotificationService.getUnreadCount('user-1');

      expect(count).toBe(5);
      expect(mockNotificationModel.getUnreadCount).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', async () => {
      const updatedPreferences = {
        ...mockNotificationPreferences,
        payment_notifications: false
      };

      mockNotificationModel.updateUserNotificationPreferences.mockResolvedValue(updatedPreferences);

      const result = await NotificationService.updateNotificationPreferences('user-1', {
        payment_notifications: false
      });

      expect(result).toEqual(updatedPreferences);
      expect(mockNotificationModel.updateUserNotificationPreferences).toHaveBeenCalledWith('user-1', {
        payment_notifications: false
      });
    });
  });
});