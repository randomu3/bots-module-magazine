import { Response } from 'express';
import { BotController, AuthenticatedRequest } from '../../controllers/botController';
import { BotModel } from '../../models/Bot';
import { TelegramService } from '../../services/telegramService';

// Mock dependencies
jest.mock('../../models/Bot');
jest.mock('../../services/telegramService');

const mockBotModel = BotModel as jest.Mocked<typeof BotModel>;
const mockTelegramService = TelegramService as jest.Mocked<typeof TelegramService>;

describe('BotController', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  beforeEach(() => {
    mockReq = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
      },
      body: {},
      params: {},
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('connectBot', () => {
    it('should connect bot successfully', async () => {
      const mockBotInfo = {
        id: 123456789,
        is_bot: true,
        first_name: 'Test Bot',
        username: 'testbot',
        can_join_groups: true,
        can_read_all_group_messages: false,
        supports_inline_queries: true,
      };

      const mockBot = {
        id: 'bot-123',
        user_id: 'user-123',
        telegram_bot_id: '123456789',
        name: 'Test Bot',
        username: 'testbot',
        description: 'Bot connected via Telegram API',
        token_hash: 'encrypted_token',
        status: 'active' as const,
        webhook_url: 'https://example.com/webhook',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockReq.body = {
        token: 'valid_bot_token',
        webhook_url: 'https://example.com/webhook',
      };

      mockTelegramService.validateBotToken.mockResolvedValueOnce(mockBotInfo);
      mockBotModel.findByTelegramId.mockResolvedValueOnce(null);
      mockBotModel.create.mockResolvedValueOnce(mockBot);
      mockTelegramService.setWebhook.mockResolvedValueOnce(true);

      await BotController.connectBot(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockTelegramService.validateBotToken).toHaveBeenCalledWith('valid_bot_token');
      expect(mockBotModel.findByTelegramId).toHaveBeenCalledWith('123456789');
      expect(mockBotModel.create).toHaveBeenCalledWith({
        user_id: 'user-123',
        telegram_bot_id: '123456789',
        name: 'Test Bot',
        username: 'testbot',
        description: 'Bot connected via Telegram API',
        token: 'valid_bot_token',
        webhook_url: 'https://example.com/webhook',
      });
      expect(mockTelegramService.setWebhook).toHaveBeenCalledWith(
        'valid_bot_token',
        'https://example.com/webhook'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Bot connected successfully',
        bot: expect.objectContaining({
          id: 'bot-123',
          name: 'Test Bot',
          telegram_info: expect.objectContaining({
            id: 123456789,
            first_name: 'Test Bot',
            username: 'testbot',
          }),
        }),
      });
    });

    it('should return 401 if user not authenticated', async () => {
      delete mockReq.user;

      await BotController.connectBot(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 400 if token is missing', async () => {
      mockReq.body = {};

      await BotController.connectBot(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Bot token is required',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 400 if token is invalid', async () => {
      mockReq.body = { token: 'invalid_token' };

      mockTelegramService.validateBotToken.mockRejectedValueOnce(
        new Error('Invalid bot token')
      );

      await BotController.connectBot(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid bot token',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 409 if bot already exists', async () => {
      const mockBotInfo = {
        id: 123456789,
        is_bot: true,
        first_name: 'Test Bot',
        username: 'testbot',
      };

      const existingBot = {
        id: 'existing-bot-123',
        telegram_bot_id: '123456789',
        user_id: 'other-user',
      };

      mockReq.body = { token: 'valid_bot_token' };

      mockTelegramService.validateBotToken.mockResolvedValueOnce(mockBotInfo);
      mockBotModel.findByTelegramId.mockResolvedValueOnce(existingBot as any);

      await BotController.connectBot(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'BOT_ALREADY_EXISTS',
          message: 'This bot is already connected to the platform',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('getBotsList', () => {
    it('should return user bots list successfully', async () => {
      const mockBots = [
        {
          id: 'bot-1',
          user_id: 'user-123',
          name: 'Bot 1',
          status: 'active',
          token_hash: 'encrypted_token_1',
        },
        {
          id: 'bot-2',
          user_id: 'user-123',
          name: 'Bot 2',
          status: 'inactive',
          token_hash: 'encrypted_token_2',
        },
      ];

      mockReq.query = { page: '1', limit: '10' };

      mockBotModel.list.mockResolvedValueOnce({
        bots: mockBots as any,
        total: 2,
      });

      await BotController.getBotsList(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockBotModel.list).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        order: 'desc',
        user_id: 'user-123',
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        bots: [
          { id: 'bot-1', user_id: 'user-123', name: 'Bot 1', status: 'active' },
          { id: 'bot-2', user_id: 'user-123', name: 'Bot 2', status: 'inactive' },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      });
    });

    it('should return 401 if user not authenticated', async () => {
      const reqWithoutUser = { ...mockReq };
      delete reqWithoutUser.user;

      await BotController.getBotsList(reqWithoutUser as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getBotById', () => {
    it('should return bot details successfully', async () => {
      const mockBot = {
        id: 'bot-123',
        user_id: 'user-123',
        name: 'Test Bot',
        status: 'active',
        token_hash: 'encrypted_token',
      };

      const mockStats = {
        total_modules: 3,
        active_modules: 2,
        total_revenue: 100.50,
        monthly_revenue: 25.75,
      };

      const mockActiveModules = [
        { id: 'activation-1', module_name: 'Module 1' },
        { id: 'activation-2', module_name: 'Module 2' },
      ];

      mockReq.params = { id: 'bot-123' };

      mockBotModel.findById.mockResolvedValueOnce(mockBot as any);
      mockBotModel.getBotStats.mockResolvedValueOnce(mockStats);
      mockBotModel.getActiveModules.mockResolvedValueOnce(mockActiveModules);

      await BotController.getBotById(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockBotModel.findById).toHaveBeenCalledWith('bot-123');
      expect(mockBotModel.getBotStats).toHaveBeenCalledWith('bot-123');
      expect(mockBotModel.getActiveModules).toHaveBeenCalledWith('bot-123');

      expect(mockRes.json).toHaveBeenCalledWith({
        bot: { id: 'bot-123', user_id: 'user-123', name: 'Test Bot', status: 'active' },
        stats: mockStats,
        active_modules: mockActiveModules,
      });
    });

    it('should return 404 if bot not found', async () => {
      mockReq.params = { id: 'nonexistent-bot' };

      mockBotModel.findById.mockResolvedValueOnce(null);

      await BotController.getBotById(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'BOT_NOT_FOUND',
          message: 'Bot not found',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 403 if bot belongs to different user', async () => {
      const mockBot = {
        id: 'bot-123',
        user_id: 'other-user',
        name: 'Test Bot',
      };

      mockReq.params = { id: 'bot-123' };

      mockBotModel.findById.mockResolvedValueOnce(mockBot as any);

      await BotController.getBotById(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this bot',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('updateBotSettings', () => {
    it('should update bot settings successfully', async () => {
      const existingBot = {
        id: 'bot-123',
        user_id: 'user-123',
        name: 'Old Name',
        status: 'active',
      };

      const updatedBot = {
        id: 'bot-123',
        user_id: 'user-123',
        name: 'New Name',
        status: 'active',
        token_hash: 'encrypted_token',
      };

      mockReq.params = { id: 'bot-123' };
      mockReq.body = { name: 'New Name' };

      mockBotModel.findById.mockResolvedValueOnce(existingBot as any);
      mockBotModel.update.mockResolvedValueOnce(updatedBot as any);

      await BotController.updateBotSettings(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockBotModel.update).toHaveBeenCalledWith('bot-123', { name: 'New Name' });
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Bot settings updated successfully',
        bot: { id: 'bot-123', user_id: 'user-123', name: 'New Name', status: 'active' },
      });
    });
  });

  describe('deleteBot', () => {
    it('should delete bot successfully', async () => {
      const existingBot = {
        id: 'bot-123',
        user_id: 'user-123',
        name: 'Test Bot',
      };

      mockReq.params = { id: 'bot-123' };

      mockBotModel.findById.mockResolvedValueOnce(existingBot as any);
      mockBotModel.getDecryptedToken.mockResolvedValueOnce('decrypted_token');
      mockTelegramService.deleteWebhook.mockResolvedValueOnce(true);
      mockBotModel.delete.mockResolvedValueOnce(true);

      await BotController.deleteBot(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockBotModel.delete).toHaveBeenCalledWith('bot-123');
      expect(mockTelegramService.deleteWebhook).toHaveBeenCalledWith('decrypted_token');
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Bot deleted successfully',
      });
    });
  });

  describe('checkBotStatus', () => {
    it('should check bot status successfully', async () => {
      const existingBot = {
        id: 'bot-123',
        user_id: 'user-123',
        name: 'Test Bot',
      };

      const mockStatusCheck = {
        is_accessible: true,
        bot_info: {
          id: 123456789,
          is_bot: true,
          first_name: 'Test Bot',
        },
        error: undefined,
      };

      const mockWebhookInfo = {
        url: 'https://example.com/webhook',
        has_custom_certificate: false,
        pending_update_count: 0,
      };

      mockReq.params = { id: 'bot-123' };

      mockBotModel.findById.mockResolvedValueOnce(existingBot as any);
      mockBotModel.getDecryptedToken.mockResolvedValueOnce('decrypted_token');
      mockTelegramService.checkBotStatus.mockResolvedValueOnce({
        isAccessible: true,
        botInfo: {
          id: 123456789,
          is_bot: true,
          first_name: 'Test Bot',
        },
      });
      mockTelegramService.getWebhookInfo.mockResolvedValueOnce(mockWebhookInfo);

      await BotController.checkBotStatus(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockTelegramService.checkBotStatus).toHaveBeenCalledWith('decrypted_token');
      expect(mockTelegramService.getWebhookInfo).toHaveBeenCalledWith('decrypted_token');
      expect(mockRes.json).toHaveBeenCalledWith({
        bot_id: 'bot-123',
        status: mockStatusCheck,
        webhook: mockWebhookInfo,
        last_checked: expect.any(String),
      });
    });
  });
});