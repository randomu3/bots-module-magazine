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

  /**
   * Send message to a specific chat
   */
  static async sendMessage(
    token: string,
    chatId: string | number,
    text: string,
    options: {
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disable_web_page_preview?: boolean;
      disable_notification?: boolean;
      reply_markup?: any;
    } = {}
  ): Promise<boolean> {
    try {
      const response = await axios.post<TelegramApiResponse<any>>(
        `${this.BASE_URL}${token}/sendMessage`,
        {
          chat_id: chatId,
          text,
          ...options,
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.ok;
    } catch (error: any) {
      console.error('Failed to send message:', error.message);
      return false;
    }
  }

  /**
   * Get bot's chat members count (for channels/groups)
   */
  static async getChatMembersCount(token: string, chatId: string | number): Promise<number> {
    try {
      const response = await axios.get<TelegramApiResponse<number>>(
        `${this.BASE_URL}${token}/getChatMembersCount`,
        {
          params: { chat_id: chatId },
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.ok && response.data.result) {
        return response.data.result;
      }

      return 0;
    } catch (error: any) {
      console.error('Failed to get chat members count:', error.message);
      return 0;
    }
  }

  /**
   * Get chat information
   */
  static async getChat(token: string, chatId: string | number): Promise<any> {
    try {
      const response = await axios.get<TelegramApiResponse<any>>(
        `${this.BASE_URL}${token}/getChat`,
        {
          params: { chat_id: chatId },
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
      console.error('Failed to get chat info:', error.message);
      return null;
    }
  }

  /**
   * Send broadcast message to multiple chats
   */
  static async sendBroadcast(
    token: string,
    chatIds: (string | number)[],
    text: string,
    options: {
      parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disable_web_page_preview?: boolean;
      disable_notification?: boolean;
      delay_between_messages?: number; // milliseconds
    } = {}
  ): Promise<{
    successful: number;
    failed: number;
    results: Array<{ chatId: string | number; success: boolean; error?: string }>;
  }> {
    const results: Array<{ chatId: string | number; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;
    const delay = options.delay_between_messages || 100; // Default 100ms delay

    for (const chatId of chatIds) {
      try {
        const success = await this.sendMessage(token, chatId, text, {
          parse_mode: options.parse_mode,
          disable_web_page_preview: options.disable_web_page_preview,
          disable_notification: options.disable_notification,
        });

        if (success) {
          successful++;
          results.push({ chatId, success: true });
        } else {
          failed++;
          results.push({ chatId, success: false, error: 'Failed to send message' });
        }
      } catch (error: any) {
        failed++;
        results.push({ chatId, success: false, error: error.message });
      }

      // Add delay between messages to avoid rate limiting
      if (delay > 0 && chatId !== chatIds[chatIds.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { successful, failed, results };
  }
}