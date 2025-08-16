import '../integration-setup';
import request from 'supertest';
import app from '../../index';
import { UserModel } from '../../models/User';
import { BotModel } from '../../models/Bot';
import { EmailVerificationTokenModel } from '../../models/EmailVerificationToken';
import { TelegramService } from '../../services/telegramService';
import { PaymentService } from '../../services/paymentService';
import { NotificationService } from '../../services/notificationService';
import { EmailService } from '../../services/emailService';

// Mock all external services
jest.mock('../../services/telegramService');
jest.mock('../../services/paymentService');
jest.mock('../../services/notificationService');
jest.mock('../../services/emailService');

const mockTelegramService = TelegramService as jest.Mocked<typeof TelegramService>;
const mockPaymentService = PaymentService as jest.Mocked<typeof PaymentService>;
const mockNotificationService = NotificationService as jest.Mocked<typeof NotificationService>;
const mockEmailService = EmailService as jest.Mocked<typeof EmailService>;

describe('Service Interactions Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let botId: string;
  let moduleId: string;

  beforeAll(async () => {
    // Create test user
    const userData = {
      email: `servicetest-${Date.now()}@example.com`,
      password: 'testpassword123',
      first_name: 'Service',
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

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    authToken = loginResponse.body.tokens.accessToken;

    // Setup bot
    const mockBotInfo = {
      id: 123456789,
      is_bot: true,
      first_name: 'Service Test Bot',
      username: 'servicetestbot'
    };

    mockTelegramService.validateBotToken.mockResolvedValue(mockBotInfo);
    mockTelegramService.setWebhook.mockResolvedValue(true);

    const botResponse = await request(app)
      .post('/api/bots/connect')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        token: 'service_test_bot_token',
        webhook_url: 'https://example.com/webhook'
      });

    botId = botResponse.body.bot.id;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default service mocks
    mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);
    mockEmailService.verifyEmailConfig.mockResolvedValue(true);
    mockNotificationService.createNotification.mockResolvedValue({
      id: 'notification-123',
      user_id: userId,
      type: 'info',
      title: 'Test',
      message: 'Test message',
      read: false,
      created_at: new Date()
    });
  });

  describe('Module Activation Workflow', () => {
    it('should complete full module activation with payment and notifications', async () => {
      // Step 1: Create payment for module activation
      const mockPaymentResponse = {
        payment_id: 'pay_module_activation',
        payment_url: 'https://payment-gateway.com/pay/module_activation',
        amount: 29.99,
        currency: 'USD',
        status: 'pending'
      };

      mockPaymentService.createPayment.mockResolvedValueOnce(mockPaymentResponse);

      const paymentResponse = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          module_id: 'advertising-module-123',
          bot_id: botId,
          amount: 29.99,
          currency: 'USD',
          payment_method: 'stripe'
        });

      expect(paymentResponse.status).toBe(201);
      const paymentId = paymentResponse.body.payment.id;

      // Step 2: Simulate successful payment webhook
      mockPaymentService.verifyWebhookSignature.mockReturnValueOnce(true);
      mockPaymentService.processPaymentWebhook.mockResolvedValueOnce({
        success: true,
        transaction_id: 'txn_module_activation'
      });

      // Mock module activation
      mockTelegramService.activateModule.mockResolvedValueOnce({
        module_id: 'advertising-module-123',
        bot_id: botId,
        api_key: 'module_api_key_123',
        webhook_url: 'https://example.com/module/webhook'
      });

      // Mock notification creation for successful activation
      mockNotificationService.createNotification.mockResolvedValueOnce({
        id: 'notification-activation',
        user_id: userId,
        type: 'success',
        title: 'Module Activated',
        message: 'Your advertising module has been successfully activated',
        read: false,
        created_at: new Date()
      });

      // Mock email notification
      mockEmailService.sendModuleActivationEmail.mockResolvedValueOnce(undefined);

      const webhookResponse = await request(app)
        .post('/api/payments/webhook')
        .set('X-Webhook-Signature', 'valid-signature')
        .send({
          event_type: 'payment.completed',
          payment_id: 'pay_module_activation',
          transaction_id: 'txn_module_activation',
          amount: 29.99,
          currency: 'USD',
          user_id: userId,
          module_id: 'advertising-module-123',
          bot_id: botId
        });

      expect(webhookResponse.status).toBe(200);

      // Verify all services were called in correct order
      expect(mockPaymentService.processPaymentWebhook).toHaveBeenCalled();
      expect(mockTelegramService.activateModule).toHaveBeenCalledWith(
        expect.any(String), // bot token
        'advertising-module-123',
        expect.any(Object) // activation config
      );
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          type: 'success',
          title: 'Module Activated'
        })
      );
      expect(mockEmailService.sendModuleActivationEmail).toHaveBeenCalled();

      // Step 3: Verify module is active in bot
      const botDetailsResponse = await request(app)
        .get(`/api/bots/${botId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(botDetailsResponse.status).toBe(200);
      expect(botDetailsResponse.body.active_modules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            module_id: 'advertising-module-123',
            status: 'active'
          })
        ])
      );
    });

    it('should handle payment failure and send appropriate notifications', async () => {
      // Mock payment failure
      mockPaymentService.verifyWebhookSignature.mockReturnValueOnce(true);
      mockPaymentService.processPaymentWebhook.mockResolvedValueOnce({
        success: false,
        error: 'Payment declined'
      });

      // Mock failure notification
      mockNotificationService.createNotification.mockResolvedValueOnce({
        id: 'notification-payment-failed',
        user_id: userId,
        type: 'error',
        title: 'Payment Failed',
        message: 'Your payment for the advertising module was declined',
        read: false,
        created_at: new Date()
      });

      // Mock failure email
      mockEmailService.sendPaymentFailureEmail.mockResolvedValueOnce(undefined);

      const webhookResponse = await request(app)
        .post('/api/payments/webhook')
        .set('X-Webhook-Signature', 'valid-signature')
        .send({
          event_type: 'payment.failed',
          payment_id: 'pay_failed_module',
          error_code: 'card_declined',
          error_message: 'Your card was declined',
          user_id: userId,
          module_id: 'advertising-module-123',
          bot_id: botId
        });

      expect(webhookResponse.status).toBe(200);

      // Verify failure handling
      expect(mockTelegramService.activateModule).not.toHaveBeenCalled();
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Payment Failed'
        })
      );
      expect(mockEmailService.sendPaymentFailureEmail).toHaveBeenCalled();
    });
  });

  describe('Bot Status Monitoring and Notifications', () => {
    it('should detect bot issues and notify user', async () => {
      // Mock bot status check failure
      mockTelegramService.checkBotStatus.mockResolvedValueOnce({
        isAccessible: false,
        error: 'Unauthorized: bot token is invalid',
        lastError: new Date()
      });

      // Mock notification for bot issue
      mockNotificationService.createNotification.mockResolvedValueOnce({
        id: 'notification-bot-issue',
        user_id: userId,
        type: 'warning',
        title: 'Bot Connection Issue',
        message: 'Your bot appears to be inaccessible. Please check your bot token.',
        read: false,
        created_at: new Date()
      });

      // Mock email alert
      mockEmailService.sendBotIssueAlert.mockResolvedValueOnce(undefined);

      const statusResponse = await request(app)
        .get(`/api/bots/${botId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.status.isAccessible).toBe(false);

      // Verify notifications were sent
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          title: 'Bot Connection Issue'
        })
      );
      expect(mockEmailService.sendBotIssueAlert).toHaveBeenCalled();
    });

    it('should handle bot recovery and send success notification', async () => {
      // Mock bot status recovery
      mockTelegramService.checkBotStatus.mockResolvedValueOnce({
        isAccessible: true,
        botInfo: {
          id: 123456789,
          is_bot: true,
          first_name: 'Service Test Bot'
        },
        responseTime: 120
      });

      // Mock recovery notification
      mockNotificationService.createNotification.mockResolvedValueOnce({
        id: 'notification-bot-recovered',
        user_id: userId,
        type: 'success',
        title: 'Bot Connection Restored',
        message: 'Your bot is now accessible and functioning normally.',
        read: false,
        created_at: new Date()
      });

      const statusResponse = await request(app)
        .get(`/api/bots/${botId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.status.isAccessible).toBe(true);

      // Verify recovery notification
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Bot Connection Restored'
        })
      );
    });
  });

  describe('Broadcast and Analytics Integration', () => {
    it('should send broadcast and update analytics', async () => {
      // Mock successful broadcast
      const mockBroadcastResult = {
        total_sent: 100,
        successful: 95,
        failed: 5,
        blocked_users: 3,
        delivery_rate: 0.95
      };

      mockTelegramService.sendBroadcast.mockResolvedValueOnce(mockBroadcastResult);

      // Mock analytics update
      mockNotificationService.updateBroadcastAnalytics.mockResolvedValueOnce({
        broadcast_id: 'broadcast-123',
        analytics_updated: true
      });

      const broadcastResponse = await request(app)
        .post(`/api/bots/${botId}/broadcast`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hello subscribers! Check out our new features.',
          target_audience: 'all_subscribers',
          track_analytics: true
        });

      expect(broadcastResponse.status).toBe(200);
      expect(broadcastResponse.body.result.successful).toBe(95);

      // Verify analytics were updated
      expect(mockTelegramService.sendBroadcast).toHaveBeenCalled();
      expect(mockNotificationService.updateBroadcastAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          broadcast_id: expect.any(String),
          delivery_stats: mockBroadcastResult
        })
      );
    });

    it('should handle broadcast failures and log analytics', async () => {
      // Mock broadcast failure
      mockTelegramService.sendBroadcast.mockRejectedValueOnce(
        new Error('Telegram API rate limit exceeded')
      );

      // Mock failure analytics
      mockNotificationService.logBroadcastFailure.mockResolvedValueOnce({
        failure_logged: true,
        retry_scheduled: true
      });

      const broadcastResponse = await request(app)
        .post(`/api/bots/${botId}/broadcast`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test broadcast',
          target_audience: 'all_subscribers'
        });

      expect(broadcastResponse.status).toBe(429); // Rate limited

      // Verify failure was logged
      expect(mockNotificationService.logBroadcastFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          bot_id: botId,
          error: 'Telegram API rate limit exceeded'
        })
      );
    });
  });

  describe('User Balance and Payment Integration', () => {
    it('should update balance after successful withdrawal', async () => {
      // Mock withdrawal request
      const withdrawalData = {
        amount: 100.00,
        currency: 'USD',
        payment_method: 'bank_transfer',
        account_details: {
          account_number: '1234567890',
          routing_number: '987654321'
        }
      };

      // Mock payment service withdrawal
      mockPaymentService.processWithdrawal.mockResolvedValueOnce({
        withdrawal_id: 'withdrawal-123',
        status: 'pending',
        processing_time: '1-3 business days'
      });

      // Mock balance update notification
      mockNotificationService.createNotification.mockResolvedValueOnce({
        id: 'notification-withdrawal',
        user_id: userId,
        type: 'info',
        title: 'Withdrawal Requested',
        message: 'Your withdrawal request of $100.00 is being processed',
        read: false,
        created_at: new Date()
      });

      // Mock email confirmation
      mockEmailService.sendWithdrawalConfirmation.mockResolvedValueOnce(undefined);

      const withdrawalResponse = await request(app)
        .post('/api/payments/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send(withdrawalData);

      expect(withdrawalResponse.status).toBe(201);
      expect(withdrawalResponse.body.withdrawal.status).toBe('pending');

      // Verify all services were called
      expect(mockPaymentService.processWithdrawal).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          amount: 100.00
        })
      );
      expect(mockNotificationService.createNotification).toHaveBeenCalled();
      expect(mockEmailService.sendWithdrawalConfirmation).toHaveBeenCalled();

      // Check updated balance
      const balanceResponse = await request(app)
        .get('/api/users/balance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(balanceResponse.status).toBe(200);
      expect(typeof balanceResponse.body.balance).toBe('number');
    });

    it('should handle insufficient balance and notify user', async () => {
      // Mock insufficient balance error
      mockPaymentService.processWithdrawal.mockRejectedValueOnce(
        new Error('Insufficient balance')
      );

      // Mock error notification
      mockNotificationService.createNotification.mockResolvedValueOnce({
        id: 'notification-insufficient-balance',
        user_id: userId,
        type: 'error',
        title: 'Withdrawal Failed',
        message: 'Insufficient balance for withdrawal request',
        read: false,
        created_at: new Date()
      });

      const withdrawalResponse = await request(app)
        .post('/api/payments/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 10000.00, // Large amount
          currency: 'USD',
          payment_method: 'bank_transfer'
        });

      expect(withdrawalResponse.status).toBe(400);
      expect(withdrawalResponse.body.error.code).toBe('INSUFFICIENT_BALANCE');

      // Verify error notification was sent
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Withdrawal Failed'
        })
      );
    });
  });

  describe('Module Performance and Analytics Integration', () => {
    it('should track module usage and update analytics', async () => {
      // Mock module usage tracking
      const usageData = {
        module_id: 'advertising-module-123',
        bot_id: botId,
        action: 'ad_displayed',
        revenue_generated: 0.05,
        user_interaction: true
      };

      // Mock analytics service
      mockNotificationService.trackModuleUsage.mockResolvedValueOnce({
        usage_tracked: true,
        analytics_updated: true
      });

      const usageResponse = await request(app)
        .post('/api/modules/track-usage')
        .set('Authorization', `Bearer ${authToken}`)
        .send(usageData);

      expect(usageResponse.status).toBe(200);
      expect(usageResponse.body.message).toBe('Usage tracked successfully');

      // Verify analytics were updated
      expect(mockNotificationService.trackModuleUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          module_id: 'advertising-module-123',
          revenue_generated: 0.05
        })
      );

      // Get updated analytics
      const analyticsResponse = await request(app)
        .get('/api/analytics/module-usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body).toHaveProperty('module_performance');
    });
  });

  describe('Support Ticket and Notification Integration', () => {
    it('should create support ticket and send notifications', async () => {
      // Mock ticket creation
      const ticketData = {
        subject: 'Module not working correctly',
        description: 'The advertising module is not displaying ads properly',
        category: 'technical',
        priority: 'medium'
      };

      // Mock support service
      const mockTicket = {
        id: 'ticket-integration-123',
        user_id: userId,
        subject: ticketData.subject,
        status: 'open',
        created_at: new Date()
      };

      // Mock notification creation
      mockNotificationService.createNotification.mockResolvedValueOnce({
        id: 'notification-ticket-created',
        user_id: userId,
        type: 'info',
        title: 'Support Ticket Created',
        message: 'Your support ticket has been created and assigned ID: ticket-integration-123',
        read: false,
        created_at: new Date()
      });

      // Mock email confirmation
      mockEmailService.sendSupportTicketConfirmation.mockResolvedValueOnce(undefined);

      const ticketResponse = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ticketData);

      expect(ticketResponse.status).toBe(201);
      expect(ticketResponse.body.ticket.subject).toBe(ticketData.subject);

      // Verify notifications were sent
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          title: 'Support Ticket Created'
        })
      );
      expect(mockEmailService.sendSupportTicketConfirmation).toHaveBeenCalled();
    });
  });

  describe('Referral System Integration', () => {
    it('should process referral signup and distribute rewards', async () => {
      // Create referrer user first
      const referrerData = {
        email: `referrer-${Date.now()}@example.com`,
        password: 'referrerpassword123',
        first_name: 'Referrer',
        last_name: 'User'
      };

      const referrerResponse = await request(app)
        .post('/api/auth/register')
        .send(referrerData);

      const referrerId = referrerResponse.body.user.id;
      const referralCode = referrerResponse.body.user.referral_code;

      // Mock referral processing
      mockPaymentService.processReferralReward.mockResolvedValueOnce({
        reward_amount: 10.00,
        currency: 'USD',
        transaction_id: 'txn_referral_reward'
      });

      // Mock notifications for both users
      mockNotificationService.createNotification
        .mockResolvedValueOnce({
          id: 'notification-referral-signup',
          user_id: referrerId,
          type: 'success',
          title: 'Referral Reward',
          message: 'You earned $10.00 for referring a new user!',
          read: false,
          created_at: new Date()
        })
        .mockResolvedValueOnce({
          id: 'notification-welcome-referred',
          user_id: userId,
          type: 'info',
          title: 'Welcome Bonus',
          message: 'Welcome! You were referred by a friend.',
          read: false,
          created_at: new Date()
        });

      // Create referred user
      const referredUserData = {
        email: `referred-${Date.now()}@example.com`,
        password: 'referredpassword123',
        first_name: 'Referred',
        last_name: 'User',
        referral_code: referralCode
      };

      const referredResponse = await request(app)
        .post('/api/auth/register')
        .send(referredUserData);

      expect(referredResponse.status).toBe(201);
      expect(referredResponse.body.user.referred_by).toBe(referralCode);

      // Verify referral processing
      expect(mockPaymentService.processReferralReward).toHaveBeenCalledWith(
        expect.objectContaining({
          referrer_id: referrerId,
          referred_user_id: referredResponse.body.user.id
        })
      );

      // Verify notifications were sent to both users
      expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle service failures gracefully', async () => {
      // Mock multiple service failures
      mockTelegramService.validateBotToken.mockRejectedValueOnce(
        new Error('Network timeout')
      );

      mockNotificationService.createNotification.mockRejectedValueOnce(
        new Error('Notification service unavailable')
      );

      // Should still handle the request gracefully
      const response = await request(app)
        .post('/api/bots/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'failing_bot_token',
          webhook_url: 'https://example.com/webhook'
        });

      // Should return appropriate error but not crash
      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should retry failed operations', async () => {
      // Mock initial failure then success
      mockPaymentService.createPayment
        .mockRejectedValueOnce(new Error('Temporary service error'))
        .mockResolvedValueOnce({
          payment_id: 'pay_retry_success',
          payment_url: 'https://payment-gateway.com/pay/retry_success',
          amount: 19.99,
          currency: 'USD',
          status: 'pending'
        });

      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          module_id: 'retry-module-123',
          bot_id: botId,
          amount: 19.99,
          currency: 'USD',
          payment_method: 'stripe'
        });

      expect(response.status).toBe(201);
      expect(response.body.payment.payment_id).toBe('pay_retry_success');

      // Verify retry was attempted
      expect(mockPaymentService.createPayment).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cross-Service Data Consistency', () => {
    it('should maintain data consistency across services', async () => {
      // Test scenario: User deletes bot, should cleanup across all services
      
      // Mock cleanup operations
      mockTelegramService.deleteWebhook.mockResolvedValueOnce(true);
      mockTelegramService.deactivateAllModules.mockResolvedValueOnce({
        deactivated_modules: ['module-1', 'module-2']
      });
      mockPaymentService.cancelActiveSubscriptions.mockResolvedValueOnce({
        cancelled_subscriptions: 2
      });
      mockNotificationService.createNotification.mockResolvedValueOnce({
        id: 'notification-bot-deleted',
        user_id: userId,
        type: 'info',
        title: 'Bot Deleted',
        message: 'Your bot and all associated modules have been removed',
        read: false,
        created_at: new Date()
      });

      const deleteResponse = await request(app)
        .delete(`/api/bots/${botId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);

      // Verify all cleanup operations were performed
      expect(mockTelegramService.deleteWebhook).toHaveBeenCalled();
      expect(mockTelegramService.deactivateAllModules).toHaveBeenCalledWith(botId);
      expect(mockPaymentService.cancelActiveSubscriptions).toHaveBeenCalledWith(
        expect.objectContaining({ bot_id: botId })
      );
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Bot Deleted'
        })
      );

      // Verify bot is no longer accessible
      const checkResponse = await request(app)
        .get(`/api/bots/${botId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkResponse.status).toBe(404);
    });
  });
});