import request from 'supertest';
import app from '../../index';
import { BotModel } from '../../models/Bot';
// UserModel imported for type checking
import { EmailVerificationTokenModel } from '../../models/EmailVerificationToken';
import { TelegramService } from '../../services/telegramService';
// Import integration setup for mocked database
import '../integration-setup';

// Mock TelegramService to avoid real API calls
jest.mock('../../services/telegramService');
const mockTelegramService = TelegramService as jest.Mocked<typeof TelegramService>;

describe('Bot Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let botId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const testUser = {
      email: `bottest-${Date.now()}@example.com`, // Make email unique
      password: 'testpassword123',
      first_name: 'Bot',
      last_name: 'Tester',
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(registerResponse.status).toBe(201);
    userId = registerResponse.body.user.id;

    // Verify email
    const verificationTokens = await EmailVerificationTokenModel.findByUserId(userId);
    expect(verificationTokens).toHaveLength(1);

    await request(app)
      .post('/api/auth/verify-email')
      .send({ token: verificationTokens[0]?.token });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(loginResponse.status).toBe(200);
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Database is mocked, no cleanup needed
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/bots/connect', () => {
    it('should connect a bot successfully', async () => {
      const mockBotInfo = {
        id: 123456789,
        is_bot: true,
        first_name: 'Test Bot',
        username: 'testbot',
        can_join_groups: true,
        can_read_all_group_messages: false,
        supports_inline_queries: true,
      };

      mockTelegramService.validateBotToken.mockResolvedValueOnce(mockBotInfo);
      mockTelegramService.setWebhook.mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/api/bots/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'valid_bot_token',
          webhook_url: 'https://example.com/webhook',
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        message: 'Bot connected successfully',
        bot: {
          name: 'Test Bot',
          username: 'testbot',
          telegram_bot_id: '123456789',
          user_id: userId,
          telegram_info: {
            id: 123456789,
            first_name: 'Test Bot',
            username: 'testbot',
          },
        },
      });

      botId = response.body.bot.id;
      expect(mockTelegramService.validateBotToken).toHaveBeenCalledWith('valid_bot_token');
      expect(mockTelegramService.setWebhook).toHaveBeenCalledWith(
        'valid_bot_token',
        'https://example.com/webhook'
      );
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/bots/connect')
        .send({
          token: 'valid_bot_token',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/bots/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 400 for invalid token', async () => {
      mockTelegramService.validateBotToken.mockRejectedValueOnce(
        new Error('Invalid bot token')
      );

      const response = await request(app)
        .post('/api/bots/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'invalid_token',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 409 for already connected bot', async () => {
      const mockBotInfo = {
        id: 987654321,
        is_bot: true,
        first_name: 'Another Bot',
        username: 'anotherbot',
      };

      // First connection
      mockTelegramService.validateBotToken.mockResolvedValueOnce(mockBotInfo);

      const firstResponse = await request(app)
        .post('/api/bots/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'another_bot_token',
        });

      expect(firstResponse.status).toBe(201);

      // Second connection attempt with same bot
      mockTelegramService.validateBotToken.mockResolvedValueOnce(mockBotInfo);

      const secondResponse = await request(app)
        .post('/api/bots/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'another_bot_token',
        });

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.error.code).toBe('BOT_ALREADY_EXISTS');

      // Clean up
      await BotModel.delete(firstResponse.body.bot.id);
    });
  });

  describe('GET /api/bots/list', () => {
    beforeEach(async () => {
      // Ensure we have a bot for testing
      if (!botId) {
        const mockBotInfo = {
          id: 111222333,
          is_bot: true,
          first_name: 'List Test Bot',
          username: 'listtestbot',
        };

        mockTelegramService.validateBotToken.mockResolvedValueOnce(mockBotInfo);

        const response = await request(app)
          .post('/api/bots/connect')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            token: 'list_test_bot_token',
          });

        botId = response.body.bot.id;
      }
    });

    it('should return user bots list', async () => {
      const response = await request(app)
        .get('/api/bots/list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('bots');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.bots)).toBe(true);
      expect(response.body.bots.length).toBeGreaterThan(0);

      // Check that token_hash is not included in response
      response.body.bots.forEach((bot: any) => {
        expect(bot).not.toHaveProperty('token_hash');
        expect(bot.user_id).toBe(userId);
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/bots/list?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 5,
        total: expect.any(Number),
        pages: expect.any(Number),
      });
    });

    it('should support search', async () => {
      const response = await request(app)
        .get('/api/bots/list?search=Test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.bots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('Test'),
          }),
        ])
      );
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/bots/list');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('GET /api/bots/:id', () => {
    it('should return bot details', async () => {
      const response = await request(app)
        .get(`/api/bots/${botId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('bot');
      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('active_modules');
      expect(response.body.bot.id).toBe(botId);
      expect(response.body.bot).not.toHaveProperty('token_hash');
    });

    it('should return 404 for non-existent bot', async () => {
      const response = await request(app)
        .get('/api/bots/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOT_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get(`/api/bots/${botId}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('PUT /api/bots/:id/settings', () => {
    it('should update bot settings', async () => {
      const updateData = {
        name: 'Updated Bot Name',
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/bots/${botId}/settings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Bot settings updated successfully',
        bot: {
          id: botId,
          name: 'Updated Bot Name',
          description: 'Updated description',
        },
      });
    });

    it('should return 404 for non-existent bot', async () => {
      const response = await request(app)
        .put('/api/bots/00000000-0000-0000-0000-000000000000/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOT_NOT_FOUND');
    });
  });

  describe('GET /api/bots/:id/status', () => {
    it('should check bot status', async () => {
      const mockStatusCheck = {
        isAccessible: true,
        botInfo: {
          id: 123456789,
          is_bot: true,
          first_name: 'Test Bot',
        },
      };

      const mockWebhookInfo = {
        url: 'https://example.com/webhook',
        has_custom_certificate: false,
        pending_update_count: 0,
      };

      mockTelegramService.checkBotStatus.mockResolvedValueOnce(mockStatusCheck);
      mockTelegramService.getWebhookInfo.mockResolvedValueOnce(mockWebhookInfo);

      const response = await request(app)
        .get(`/api/bots/${botId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        bot_id: botId,
        status: mockStatusCheck,
        webhook: mockWebhookInfo,
        last_checked: expect.any(String),
      });
    });
  });

  describe('DELETE /api/bots/:id', () => {
    it('should delete bot', async () => {
      // Create a bot specifically for deletion test
      const mockBotInfo = {
        id: 555666777,
        is_bot: true,
        first_name: 'Delete Test Bot',
        username: 'deletetestbot',
      };

      mockTelegramService.validateBotToken.mockResolvedValueOnce(mockBotInfo);

      const createResponse = await request(app)
        .post('/api/bots/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'delete_test_bot_token',
        });

      const deleteBotId = createResponse.body.bot.id;

      mockTelegramService.deleteWebhook.mockResolvedValueOnce(true);

      const deleteResponse = await request(app)
        .delete(`/api/bots/${deleteBotId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toMatchObject({
        message: 'Bot deleted successfully',
      });

      // Verify bot is actually deleted
      const checkResponse = await request(app)
        .get(`/api/bots/${deleteBotId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkResponse.status).toBe(404);
    });

    it('should return 404 for non-existent bot', async () => {
      const response = await request(app)
        .delete('/api/bots/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOT_NOT_FOUND');
    });
  });
});