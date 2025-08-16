import { BroadcastService } from '../../services/broadcastService';
import { NotificationModel } from '../../models/Notification';
import { BotModel } from '../../models/Bot';
import { TelegramService } from '../../services/telegramService';

// Mock dependencies
jest.mock('../../models/Notification');
jest.mock('../../models/Bot');
jest.mock('../../services/telegramService');

const mockNotificationModel = NotificationModel as jest.Mocked<typeof NotificationModel>;
const mockBotModel = BotModel as jest.Mocked<typeof BotModel>;
const mockTelegramService = TelegramService as jest.Mocked<typeof TelegramService>;

describe('BroadcastService', () => {
  const mockBot = {
    id: 'bot-1',
    user_id: 'user-1',
    name: 'Test Bot',
    token_hash: 'encrypted-token',
    status: 'active' as const,
    telegram_bot_id: '123456789',
    username: 'testbot',
    webhook_url: 'https://example.com/webhook',
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockBroadcast = {
    id: 'broadcast-1',
    title: 'Test Broadcast',
    message: 'Hello everyone!',
    type: 'system_announcement' as const,
    target_audience: {
      user_id: 'user-1',
      targets: [{ bot_id: 'bot-1', chat_count: 2 }]
    },
    status: 'draft',
    total_recipients: 2,
    successful_sends: 0,
    failed_sends: 0,
    metadata: {
      message_options: {},
      targets: [
        {
          botId: 'bot-1',
          chatIds: ['chat1', 'chat2']
        }
      ]
    },
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBroadcastCampaign', () => {
    it('should create a broadcast campaign successfully', async () => {
      mockBotModel.findById.mockResolvedValue(mockBot);
      mockNotificationModel.createBroadcast.mockResolvedValue(mockBroadcast);
      mockNotificationModel.updateBroadcastStatus.mockResolvedValue(mockBroadcast);

      const input = {
        userId: 'user-1',
        title: 'Test Broadcast',
        message: 'Hello everyone!',
        targets: [
          {
            botId: 'bot-1',
            chatIds: ['chat1', 'chat2']
          }
        ]
      };

      const result = await BroadcastService.createBroadcastCampaign(input);

      expect(mockBotModel.findById).toHaveBeenCalledWith('bot-1');
      expect(mockNotificationModel.createBroadcast).toHaveBeenCalledWith({
        title: 'Test Broadcast',
        message: 'Hello everyone!',
        type: 'system_announcement',
        target_audience: {
          user_id: 'user-1',
          targets: [{ bot_id: 'bot-1', chat_count: 2 }]
        },
        scheduled_at: undefined,
        metadata: {
          message_options: {},
          targets: input.targets
        }
      });
      expect(mockNotificationModel.updateBroadcastStatus).toHaveBeenCalledWith(
        'broadcast-1',
        'draft',
        { total_recipients: 2 }
      );
      expect(result).toEqual(mockBroadcast);
    });

    it('should throw error if bot not found', async () => {
      mockBotModel.findById.mockResolvedValue(null);

      const input = {
        userId: 'user-1',
        title: 'Test Broadcast',
        message: 'Hello everyone!',
        targets: [
          {
            botId: 'bot-1',
            chatIds: ['chat1', 'chat2']
          }
        ]
      };

      await expect(BroadcastService.createBroadcastCampaign(input))
        .rejects.toThrow('Bot bot-1 not found or access denied');
    });

    it('should throw error if user does not own bot', async () => {
      const botOwnedByOther = { ...mockBot, user_id: 'other-user' };
      mockBotModel.findById.mockResolvedValue(botOwnedByOther);

      const input = {
        userId: 'user-1',
        title: 'Test Broadcast',
        message: 'Hello everyone!',
        targets: [
          {
            botId: 'bot-1',
            chatIds: ['chat1', 'chat2']
          }
        ]
      };

      await expect(BroadcastService.createBroadcastCampaign(input))
        .rejects.toThrow('Bot bot-1 not found or access denied');
    });
  });

  describe('executeBroadcast', () => {
    it('should execute broadcast successfully', async () => {
      mockNotificationModel.getBroadcastById.mockResolvedValue(mockBroadcast);
      mockNotificationModel.updateBroadcastStatus.mockResolvedValue(mockBroadcast);
      mockBotModel.findById.mockResolvedValue(mockBot);
      mockTelegramService.sendBroadcast.mockResolvedValue({
        successful: 2,
        failed: 0,
        results: [
          { chatId: 'chat1', success: true },
          { chatId: 'chat2', success: true }
        ]
      });

      const stats = await BroadcastService.executeBroadcast('broadcast-1');

      expect(mockNotificationModel.getBroadcastById).toHaveBeenCalledWith('broadcast-1');
      expect(mockNotificationModel.updateBroadcastStatus).toHaveBeenCalledWith('broadcast-1', 'sending');
      expect(mockBotModel.findById).toHaveBeenCalledWith('bot-1');
      expect(mockTelegramService.sendBroadcast).toHaveBeenCalledWith(
        'encrypted-token',
        ['chat1', 'chat2'],
        'Hello everyone!',
        {
          delay_between_messages: 200
        }
      );
      expect(mockNotificationModel.updateBroadcastStatus).toHaveBeenCalledWith(
        'broadcast-1',
        'sent',
        {
          total_recipients: 2,
          successful_sends: 2,
          failed_sends: 0
        }
      );

      expect(stats).toEqual({
        totalTargets: 2,
        successfulSends: 2,
        failedSends: 0,
        deliveryRate: 100
      });
    });

    it('should throw error if broadcast not found', async () => {
      mockNotificationModel.getBroadcastById.mockResolvedValue(null);

      await expect(BroadcastService.executeBroadcast('broadcast-1'))
        .rejects.toThrow('Broadcast not found');
    });

    it('should throw error if broadcast cannot be executed', async () => {
      const sentBroadcast = { ...mockBroadcast, status: 'sent' };
      mockNotificationModel.getBroadcastById.mockResolvedValue(sentBroadcast);

      await expect(BroadcastService.executeBroadcast('broadcast-1'))
        .rejects.toThrow('Broadcast cannot be executed in current status');
    });

    it('should handle partial failures', async () => {
      mockNotificationModel.getBroadcastById.mockResolvedValue(mockBroadcast);
      mockNotificationModel.updateBroadcastStatus.mockResolvedValue(mockBroadcast);
      mockBotModel.findById.mockResolvedValue(mockBot);
      mockTelegramService.sendBroadcast.mockResolvedValue({
        successful: 1,
        failed: 1,
        results: [
          { chatId: 'chat1', success: true },
          { chatId: 'chat2', success: false, error: 'Chat not found' }
        ]
      });

      const stats = await BroadcastService.executeBroadcast('broadcast-1');

      expect(stats).toEqual({
        totalTargets: 2,
        successfulSends: 1,
        failedSends: 1,
        deliveryRate: 50
      });
    });
  });

  describe('validateBroadcastTargets', () => {
    it('should validate targets successfully', async () => {
      mockBotModel.findById.mockResolvedValue(mockBot);

      const targets = [
        {
          botId: 'bot-1',
          chatIds: ['chat1', 'chat2']
        }
      ];

      const result = await BroadcastService.validateBroadcastTargets('user-1', targets);

      expect(result).toEqual({
        valid: true,
        errors: [],
        totalChatIds: 2
      });
    });

    it('should return errors for invalid targets', async () => {
      mockBotModel.findById.mockResolvedValue(null);

      const targets = [
        {
          botId: 'bot-1',
          chatIds: ['chat1', 'chat2']
        }
      ];

      const result = await BroadcastService.validateBroadcastTargets('user-1', targets);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Bot bot-1 not found');
    });

    it('should return error for inactive bot', async () => {
      const inactiveBot = { ...mockBot, status: 'inactive' as const };
      mockBotModel.findById.mockResolvedValue(inactiveBot);

      const targets = [
        {
          botId: 'bot-1',
          chatIds: ['chat1', 'chat2']
        }
      ];

      const result = await BroadcastService.validateBroadcastTargets('user-1', targets);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Bot Test Bot is not active');
    });

    it('should return error for too many chat IDs', async () => {
      mockBotModel.findById.mockResolvedValue(mockBot);

      const targets = [
        {
          botId: 'bot-1',
          chatIds: new Array(1001).fill('chat').map((_, i) => `chat${i}`)
        }
      ];

      const result = await BroadcastService.validateBroadcastTargets('user-1', targets);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Too many chat IDs for bot Test Bot (max 1000 per bot)');
    });
  });

  describe('getBroadcastStats', () => {
    it('should return broadcast statistics', async () => {
      const completedBroadcast = {
        ...mockBroadcast,
        status: 'sent',
        total_recipients: 100,
        successful_sends: 95,
        failed_sends: 5
      };

      mockNotificationModel.getBroadcastById.mockResolvedValue(completedBroadcast);

      const stats = await BroadcastService.getBroadcastStats('broadcast-1');

      expect(stats).toEqual({
        totalTargets: 100,
        successfulSends: 95,
        failedSends: 5,
        deliveryRate: 95
      });
    });

    it('should return null if broadcast not found', async () => {
      mockNotificationModel.getBroadcastById.mockResolvedValue(null);

      const stats = await BroadcastService.getBroadcastStats('broadcast-1');

      expect(stats).toBeNull();
    });
  });

  describe('estimateBroadcastCost', () => {
    it('should estimate broadcast cost correctly', async () => {
      const targets = [
        {
          botId: 'bot-1',
          chatIds: ['chat1', 'chat2', 'chat3']
        },
        {
          botId: 'bot-2',
          chatIds: ['chat4', 'chat5']
        }
      ];

      const estimate = await BroadcastService.estimateBroadcastCost(targets);

      expect(estimate).toEqual({
        totalMessages: 5,
        estimatedCost: 0.005, // 5 * $0.001
        currency: 'USD'
      });
    });
  });
});