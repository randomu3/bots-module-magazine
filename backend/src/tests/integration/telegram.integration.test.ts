import '../integration-setup';
import request from 'supertest';
import app from '../../index';
import { UserModel } from '../../models/User';
import { BotModel } from '../../models/Bot';
import { EmailVerificationTokenModel } from '../../models/EmailVerificationToken';
import { TelegramService } from '../../services/telegramService';

// Mock TelegramService for controlled testing
jest.mock('../../services/telegramService');
const mockTelegramService = TelegramService as jest.Mocked<typeof TelegramService>;

// Mock email service
jest.mock('../../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  verifyEmailConfig: jest.fn().mockResolvedValue(true)
}));

describe('Telegram API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let botId: string;

  beforeAll(async () => {
    // Create and verify test user
    const userData = {
      email: `telegramtest-${Date.now()}@example.com`,
      password: 'testpassword123',
      first_name: 'Telegram',
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
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Bot Token Validation', () => {
    it('should validate bot token successfully', async () => {
      const mockBotInfo = {
        id: 123456789,
        is_bot: true,
        first_name: 'Test Bot',
        username: 'testbot',
        can_join_groups: true,
        can_read_all_group_messages: false,
        supports_inline_queries: true,
        description: 'A test bot for integration testing'
      };

      mockTelegramService.validateBotToken.mockResolvedValueOnce(mockBotInfo);
      mockTelegramService.setWebhook.mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/api/bots/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'valid_bot_token_123',
          webhook_url: 'https://example.com/webhook'
        });

      expect(response.status).toBe(201);
      expect(response.body.bot).toMatchObject({
        name: 'Test Bot',
        username: 'testbot',
        telegram_bot_id: '123456789',
        telegram_info: mockBotInfo
      });

      botId = response.body.bot.id;

      expect(mockTelegramService.validateBotToken).toHaveBeenCalledWith('valid_bot_token_123');
      expect(mockTelegramService.setWebhook).toHaveBeenCalledWith(
        'valid_bot_token_123',
        'https://example.com/webhook'
      );
    });

    it('should handle invalid bot token', async () => {
      mockTelegramService.validateBotToken.mockRejectedValueOnce(
        new Error('Unauthorized: bot token is invalid')
      );

      const response = await request(app)
        .post('/api/bots/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'invalid_bot_token',
          webhook_url: 'https://example.com/webhook'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should handle Telegram API rate limiting', async () => {
      mockTelegramService.validateBotToken.mockRejectedValueOnce(
        new Error('Too Many Requests: retry after 30')
      );

      const response = await request(app)
        .post('/api/bots/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'rate_limited_token',
          webhook_url: 'https://example.com/webhook'
        });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMITED');
    });

    it('should handle network errors with Telegram API', async () => {
      mockTelegramService.validateBotToken.mockRejectedValueOnce(
        new Error('Network Error: ECONNREFUSED')
      );

      const response = await request(app)
        .post('/api/bots/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'network_error_token',
          webhook_url: 'https://example.com/webhook'
        });

      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('TELEGRAM_API_UNAVAILABLE');
    });
  });

  describe('Webhook Management', () => {
    beforeEach(async () => {
      // Ensure we have a bot for webhook testing
      if (!botId) {
        const mockBotInfo = {
          id: 987654321,
          is_bot: true,
          first_name: 'Webhook Test Bot',
          username: 'webhooktestbot'
        };

        mockTelegramService.validateBotToken.mockResolvedValueOnce(mockBotInfo);
        mockTelegramService.setWebhook.mockResolvedValueOnce(true);

        const response = await request(app)
          .post('/api/bots/connect')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            token: 'webhook_test_token',
            webhook_url: 'https://example.com/webhook'
          });

        botId = response.body.bot.id;
      }
    });

    it('should set webhook successfully', async () => {
      mockTelegramService.setWebhook.mockResolvedValueOnce(true);

      const response = await request(app)
        .put(`/api/bots/${botId}/webhook`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          webhook_url: 'https://newdomain.com/webhook',
          max_connections: 40,
          allowed_updates: ['message', 'callback_query']
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Webhook updated successfully');

      expect(mockTelegramService.setWebhook).toHaveBeenCalledWith(
        expect.any(String), // bot token
        'https://newdomain.com/webhook',
        {
          max_connections: 40,
          allowed_updates: ['message', 'callback_query']
        }
      );
    });

    it('should get webhook info', async () => {
      const mockWebhookInfo = {
        url: 'https://example.com/webhook',
        has_custom_certificate: false,
        pending_update_count: 0,
        last_error_date: null,
        last_error_message: null,
        max_connections: 40,
        allowed_updates: ['message', 'callback_query']
      };

      mockTelegramService.getWebhookInfo.mockResolvedValueOnce(mockWebhookInfo);

      const response = await request(app)
        .get(`/api/bots/${botId}/webhook`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.webhook).toEqual(mockWebhookInfo);
    });

    it('should delete webhook', async () => {
      mockTelegramService.deleteWebhook.mockResolvedValueOnce(true);

      const response = await request(app)
        .delete(`/api/bots/${botId}/webhook`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Webhook deleted successfully');

      expect(mockTelegramService.deleteWebhook).toHaveBeenCalled();
    });

    it('should handle webhook SSL certificate errors', async () => {
      mockTelegramService.setWebhook.mockRejectedValueOnce(
        new Error('Bad Request: SSL certificate verify failed')
      );

      const response = await request(app)
        .put(`/api/bots/${botId}/webhook`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          webhook_url: 'https://invalid-ssl.com/webhook'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_SSL_CERTIFICATE');
    });
  });

  describe('Bot Status Monitoring', () => {
    it('should check bot status and accessibility', async () => {
      const mockStatusCheck = {
        isAccessible: true,
        botInfo: {
          id: 123456789,
          is_bot: true,
          first_name: 'Test Bot',
          username: 'testbot'
        },
        lastSeen: new Date(),
        responseTime: 150
      };

      mockTelegramService.checkBotStatus.mockResolvedValueOnce(mockStatusCheck);

      const response = await request(app)
        .get(`/api/bots/${botId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        bot_id: botId,
        status: mockStatusCheck,
        last_checked: expect.any(String)
      });
    });

    it('should detect inaccessible bot', async () => {
      const mockStatusCheck = {
        isAccessible: false,
        error: 'Unauthorized: bot token is invalid',
        lastError: new Date()
      };

      mockTelegramService.checkBotStatus.mockResolvedValueOnce(mockStatusCheck);

      const response = await request(app)
        .get(`/api/bots/${botId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status.isAccessible).toBe(false);
      expect(response.body.status.error).toBeDefined();
    });

    it('should get bot updates and statistics', async () => {
      const mockUpdates = [
        {
          update_id: 123456,
          message: {
            message_id: 1,
            from: { id: 987654321, first_name: 'User' },
            chat: { id: 987654321, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: '/start'
          }
        }
      ];

      mockTelegramService.getUpdates.mockResolvedValueOnce(mockUpdates);

      const response = await request(app)
        .get(`/api/bots/${botId}/updates`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.updates).toEqual(mockUpdates);
      expect(Array.isArray(response.body.updates)).toBe(true);
    });
  });

  describe('Message Broadcasting', () => {
    it('should send broadcast message to subscribers', async () => {
      const mockBroadcastResult = {
        total_sent: 150,
        successful: 145,
        failed: 5,
        blocked_users: 3,
        errors: [
          { chat_id: 123, error: 'Bot was blocked by the user' },
          { chat_id: 456, error: 'Chat not found' }
        ]
      };

      mockTelegramService.sendBroadcast.mockResolvedValueOnce(mockBroadcastResult);

      const response = await request(app)
        .post(`/api/bots/${botId}/broadcast`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hello subscribers! This is a test broadcast.',
          parse_mode: 'HTML',
          target_audience: 'all_subscribers'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Broadcast sent successfully',
        result: mockBroadcastResult
      });

      expect(mockTelegramService.sendBroadcast).toHaveBeenCalledWith(
        expect.any(String), // bot token
        {
          message: 'Hello subscribers! This is a test broadcast.',
          parse_mode: 'HTML',
          target_audience: 'all_subscribers'
        }
      );
    });

    it('should handle broadcast with media attachments', async () => {
      const mockBroadcastResult = {
        total_sent: 100,
        successful: 98,
        failed: 2
      };

      mockTelegramService.sendBroadcast.mockResolvedValueOnce(mockBroadcastResult);

      const response = await request(app)
        .post(`/api/bots/${botId}/broadcast`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Check out this image!',
          media: {
            type: 'photo',
            url: 'https://example.com/image.jpg'
          },
          target_audience: 'active_users'
        });

      expect(response.status).toBe(200);
      expect(response.body.result.successful).toBe(98);
    });

    it('should validate broadcast message content', async () => {
      const response = await request(app)
        .post(`/api/bots/${botId}/broadcast`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '', // Empty message
          target_audience: 'all_subscribers'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Subscriber Management', () => {
    it('should get bot subscribers list', async () => {
      const response = await request(app)
        .get(`/api/bots/${botId}/subscribers`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('subscribers');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('statistics');
      expect(Array.isArray(response.body.subscribers)).toBe(true);
    });

    it('should filter subscribers by activity', async () => {
      const response = await request(app)
        .get(`/api/bots/${botId}/subscribers?status=active&last_activity=7d`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.subscribers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'active'
          })
        ])
      );
    });

    it('should add subscriber manually', async () => {
      const response = await request(app)
        .post(`/api/bots/${botId}/subscribers`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chat_id: 987654321,
          first_name: 'Manual',
          last_name: 'Subscriber',
          username: 'manual_subscriber'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        message: 'Subscriber added successfully',
        subscriber: {
          chat_id: 987654321,
          first_name: 'Manual',
          status: 'active'
        }
      });
    });

    it('should remove subscriber', async () => {
      const response = await request(app)
        .delete(`/api/bots/${botId}/subscribers/987654321`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Subscriber removed successfully');
    });
  });

  describe('Bot Commands and Interactions', () => {
    it('should set bot commands', async () => {
      const commands = [
        { command: 'start', description: 'Start the bot' },
        { command: 'help', description: 'Show help message' },
        { command: 'settings', description: 'Bot settings' }
      ];

      mockTelegramService.setBotCommands.mockResolvedValueOnce(true);

      const response = await request(app)
        .put(`/api/bots/${botId}/commands`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ commands });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Bot commands updated successfully');

      expect(mockTelegramService.setBotCommands).toHaveBeenCalledWith(
        expect.any(String), // bot token
        commands
      );
    });

    it('should get bot commands', async () => {
      const mockCommands = [
        { command: 'start', description: 'Start the bot' },
        { command: 'help', description: 'Show help message' }
      ];

      mockTelegramService.getBotCommands.mockResolvedValueOnce(mockCommands);

      const response = await request(app)
        .get(`/api/bots/${botId}/commands`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.commands).toEqual(mockCommands);
    });

    it('should send message to specific chat', async () => {
      const mockMessageResult = {
        message_id: 123,
        chat: { id: 987654321 },
        date: Math.floor(Date.now() / 1000),
        text: 'Test message'
      };

      mockTelegramService.sendMessage.mockResolvedValueOnce(mockMessageResult);

      const response = await request(app)
        .post(`/api/bots/${botId}/send-message`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chat_id: 987654321,
          text: 'Test message',
          parse_mode: 'HTML'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Message sent successfully',
        result: mockMessageResult
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Telegram API timeout errors', async () => {
      mockTelegramService.validateBotToken.mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const response = await request(app)
        .post('/api/bots/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'timeout_test_token',
          webhook_url: 'https://example.com/webhook'
        });

      expect(response.status).toBe(504);
      expect(response.body.error.code).toBe('TELEGRAM_API_TIMEOUT');
    });

    it('should handle bot token revocation', async () => {
      mockTelegramService.checkBotStatus.mockRejectedValueOnce(
        new Error('Unauthorized: bot token is invalid')
      );

      const response = await request(app)
        .get(`/api/bots/${botId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('BOT_TOKEN_REVOKED');
    });

    it('should retry failed Telegram API calls', async () => {
      // First call fails, second succeeds
      mockTelegramService.validateBotToken
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          id: 555666777,
          is_bot: true,
          first_name: 'Retry Test Bot',
          username: 'retrytestbot'
        });

      mockTelegramService.setWebhook.mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/api/bots/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'retry_test_token',
          webhook_url: 'https://example.com/webhook'
        });

      expect(response.status).toBe(201);
      expect(response.body.bot.name).toBe('Retry Test Bot');
      
      // Should have been called twice due to retry
      expect(mockTelegramService.validateBotToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('Webhook Processing', () => {
    it('should process incoming webhook updates', async () => {
      const webhookUpdate = {
        update_id: 123456789,
        message: {
          message_id: 1,
          from: {
            id: 987654321,
            is_bot: false,
            first_name: 'Test',
            username: 'testuser'
          },
          chat: {
            id: 987654321,
            first_name: 'Test',
            username: 'testuser',
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: '/start'
        }
      };

      const response = await request(app)
        .post(`/api/bots/${botId}/webhook`)
        .send(webhookUpdate);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Update processed successfully');
    });

    it('should handle callback query updates', async () => {
      const callbackUpdate = {
        update_id: 123456790,
        callback_query: {
          id: 'callback123',
          from: {
            id: 987654321,
            first_name: 'Test',
            username: 'testuser'
          },
          message: {
            message_id: 1,
            chat: { id: 987654321 },
            date: Math.floor(Date.now() / 1000),
            text: 'Choose an option:'
          },
          data: 'button_clicked'
        }
      };

      const response = await request(app)
        .post(`/api/bots/${botId}/webhook`)
        .send(callbackUpdate);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Update processed successfully');
    });

    it('should validate webhook update structure', async () => {
      const invalidUpdate = {
        // Missing update_id
        message: {
          text: 'Invalid update'
        }
      };

      const response = await request(app)
        .post(`/api/bots/${botId}/webhook`)
        .send(invalidUpdate);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_UPDATE_FORMAT');
    });
  });
});