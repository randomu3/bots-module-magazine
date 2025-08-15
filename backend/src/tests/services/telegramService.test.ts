import axios from 'axios';
import { TelegramService } from '../../services/telegramService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TelegramService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateBotToken', () => {
    it('should validate a valid bot token successfully', async () => {
      const mockBotInfo = {
        id: 123456789,
        is_bot: true,
        first_name: 'Test Bot',
        username: 'testbot',
        can_join_groups: true,
        can_read_all_group_messages: false,
        supports_inline_queries: true,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          ok: true,
          result: mockBotInfo,
        },
      });

      const result = await TelegramService.validateBotToken('valid_token');

      expect(result).toEqual(mockBotInfo);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.telegram.org/botvalid_token/getMe',
        expect.objectContaining({
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should throw error for invalid token format', async () => {
      await expect(TelegramService.validateBotToken('')).rejects.toThrow(
        'Invalid bot token format'
      );

      await expect(TelegramService.validateBotToken(null as any)).rejects.toThrow(
        'Invalid bot token format'
      );
    });

    it('should throw error when Telegram API returns error', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          ok: false,
          error_code: 401,
          description: 'Unauthorized',
        },
      });

      await expect(TelegramService.validateBotToken('invalid_token')).rejects.toThrow(
        'Unauthorized'
      );
    });

    it('should throw error when token belongs to user account', async () => {
      const mockUserInfo = {
        id: 123456789,
        is_bot: false,
        first_name: 'John',
        username: 'john_doe',
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          ok: true,
          result: mockUserInfo,
        },
      });

      await expect(TelegramService.validateBotToken('user_token')).rejects.toThrow(
        'Token does not belong to a bot'
      );
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        code: 'ENOTFOUND',
        message: 'Network error',
      });

      await expect(TelegramService.validateBotToken('token')).rejects.toThrow(
        'Unable to connect to Telegram API'
      );
    });

    it('should handle timeout errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'Timeout',
      });

      await expect(TelegramService.validateBotToken('token')).rejects.toThrow(
        'Request timeout - please try again'
      );
    });

    it('should handle 401 unauthorized error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: {
            error_code: 401,
            description: 'Unauthorized',
          },
        },
      });

      await expect(TelegramService.validateBotToken('token')).rejects.toThrow(
        'Invalid bot token'
      );
    });
  });

  describe('setWebhook', () => {
    it('should set webhook successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          ok: true,
          result: true,
        },
      });

      const result = await TelegramService.setWebhook('token', 'https://example.com/webhook');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.telegram.org/bottoken/setWebhook',
        {
          url: 'https://example.com/webhook',
          allowed_updates: ['message', 'callback_query', 'inline_query'],
        },
        expect.objectContaining({
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should return false on webhook set failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await TelegramService.setWebhook('token', 'https://example.com/webhook');

      expect(result).toBe(false);
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          ok: true,
          result: true,
        },
      });

      const result = await TelegramService.deleteWebhook('token');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.telegram.org/bottoken/deleteWebhook',
        {},
        expect.objectContaining({
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should return false on webhook delete failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await TelegramService.deleteWebhook('token');

      expect(result).toBe(false);
    });
  });

  describe('getWebhookInfo', () => {
    it('should get webhook info successfully', async () => {
      const mockWebhookInfo = {
        url: 'https://example.com/webhook',
        has_custom_certificate: false,
        pending_update_count: 0,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          ok: true,
          result: mockWebhookInfo,
        },
      });

      const result = await TelegramService.getWebhookInfo('token');

      expect(result).toEqual(mockWebhookInfo);
    });

    it('should return null on failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await TelegramService.getWebhookInfo('token');

      expect(result).toBeNull();
    });
  });

  describe('checkBotStatus', () => {
    it('should return accessible status for valid bot', async () => {
      const mockBotInfo = {
        id: 123456789,
        is_bot: true,
        first_name: 'Test Bot',
        username: 'testbot',
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          ok: true,
          result: mockBotInfo,
        },
      });

      const result = await TelegramService.checkBotStatus('valid_token');

      expect(result).toEqual({
        isAccessible: true,
        botInfo: mockBotInfo,
      });
    });

    it('should return inaccessible status for invalid bot', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: {
            error_code: 401,
            description: 'Unauthorized',
          },
        },
      });

      const result = await TelegramService.checkBotStatus('invalid_token');

      expect(result).toEqual({
        isAccessible: false,
        error: 'Invalid bot token',
      });
    });
  });
});