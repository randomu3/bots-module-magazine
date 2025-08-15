import axios from 'axios';

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
  can_connect_to_business?: boolean;
  has_main_web_app?: boolean;
}

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

export class TelegramService {
  private static readonly BASE_URL = 'https://api.telegram.org/bot';

  /**
   * Validate bot token and get bot information
   */
  static async validateBotToken(token: string): Promise<TelegramBotInfo> {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid bot token format');
    }

    try {
      const response = await axios.get<TelegramApiResponse<TelegramBotInfo>>(
        `${this.BASE_URL}${token}/getMe`,
        {
          timeout: 10000, // 10 seconds timeout
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.ok || !response.data.result) {
        throw new Error(
          response.data.description || 'Failed to validate bot token'
        );
      }

      const botInfo = response.data.result;

      // Verify it's actually a bot
      if (!botInfo.is_bot) {
        throw new Error('Token does not belong to a bot');
      }

      return botInfo;
    } catch (error: any) {
      if (error.response) {
        // Telegram API returned an error
        const telegramError = error.response.data;
        if (telegramError.error_code === 401) {
          throw new Error('Invalid bot token');
        }
        throw new Error(
          telegramError.description || 'Failed to validate bot token'
        );
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - please try again');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to Telegram API');
      }
      
      throw new Error(error.message || 'Failed to validate bot token');
    }
  }

  /**
   * Set webhook for a bot
   */
  static async setWebhook(token: string, webhookUrl: string): Promise<boolean> {
    try {
      const response = await axios.post<TelegramApiResponse<boolean>>(
        `${this.BASE_URL}${token}/setWebhook`,
        {
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query', 'inline_query'],
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.ok && response.data.result === true;
    } catch (error: any) {
      console.error('Failed to set webhook:', error.message);
      return false;
    }
  }

  /**
   * Remove webhook for a bot
   */
  static async deleteWebhook(token: string): Promise<boolean> {
    try {
      const response = await axios.post<TelegramApiResponse<boolean>>(
        `${this.BASE_URL}${token}/deleteWebhook`,
        {},
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.ok && response.data.result === true;
    } catch (error: any) {
      console.error('Failed to delete webhook:', error.message);
      return false;
    }
  }

  /**
   * Get webhook info for a bot
   */
  static async getWebhookInfo(token: string): Promise<any> {
    try {
      const response = await axios.get<TelegramApiResponse<any>>(
        `${this.BASE_URL}${token}/getWebhookInfo`,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.ok && response.data.result) {
        return response.data.result;
      }

      return null;
    } catch (error: any) {
      console.error('Failed to get webhook info:', error.message);
      return null;
    }
  }

  /**
   * Check if bot is accessible and responding
   */
  static async checkBotStatus(token: string): Promise<{
    isAccessible: boolean;
    botInfo?: TelegramBotInfo;
    error?: string;
  }> {
    try {
      const botInfo = await this.validateBotToken(token);
      return {
        isAccessible: true,
        botInfo,
      };
    } catch (error: any) {
      return {
        isAccessible: false,
        error: error.message,
      };
    }
  }
}