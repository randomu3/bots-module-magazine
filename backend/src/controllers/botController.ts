import { Request, Response } from 'express';
import { BotModel } from '../models/Bot';
import { BotModuleActivationModel } from '../models/BotModuleActivation';
import { TelegramService } from '../services/telegramService';
import { CreateBotInput, UpdateBotInput } from '../types/database';
import { botFilterSchema } from '../validation/schemas';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class BotController {
  /**
   * Connect a new bot to the platform
   * POST /bots/connect
   */
  static async connectBot(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { token, webhook_url } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (!token) {
        res.status(400).json({
          error: {
            code: 'MISSING_TOKEN',
            message: 'Bot token is required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Validate bot token with Telegram API
      let botInfo;
      try {
        botInfo = await TelegramService.validateBotToken(token);
      } catch (error: any) {
        res.status(400).json({
          error: {
            code: 'INVALID_TOKEN',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Check if bot is already connected
      const existingBot = await BotModel.findByTelegramId(botInfo.id.toString());
      if (existingBot) {
        res.status(409).json({
          error: {
            code: 'BOT_ALREADY_EXISTS',
            message: 'This bot is already connected to the platform',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Create bot record
      const createBotInput: CreateBotInput = {
        user_id: userId,
        telegram_bot_id: botInfo.id.toString(),
        name: botInfo.first_name,
        description: `Bot connected via Telegram API`,
        token: token,
      };

      // Add optional fields only if they exist
      if (botInfo.username) {
        createBotInput.username = botInfo.username;
      }
      if (webhook_url) {
        createBotInput.webhook_url = webhook_url;
      }

      const bot = await BotModel.create(createBotInput);

      // Set webhook if provided
      if (webhook_url) {
        try {
          await TelegramService.setWebhook(token, webhook_url);
        } catch (error) {
          console.warn('Failed to set webhook, but bot was created:', error);
        }
      }

      // Return bot info without sensitive data
      const { token_hash, ...botResponse } = bot;
      
      res.status(201).json({
        message: 'Bot connected successfully',
        bot: {
          ...botResponse,
          telegram_info: {
            id: botInfo.id,
            first_name: botInfo.first_name,
            username: botInfo.username,
            can_join_groups: botInfo.can_join_groups,
            can_read_all_group_messages: botInfo.can_read_all_group_messages,
            supports_inline_queries: botInfo.supports_inline_queries,
          },
        },
      });
    } catch (error: any) {
      console.error('Error connecting bot:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to connect bot',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get list of user's bots
   * GET /bots/list
   */
  static async getBotsList(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Validate query parameters
      const { error, value } = botFilterSchema.validate(req.query);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid query parameters',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const filters = {
        ...value,
        user_id: userId, // Always filter by current user
      };

      const result = await BotModel.list(filters);

      // Remove sensitive data from response
      const botsWithoutTokens = result.bots.map(bot => {
        const { token_hash, ...botData } = bot;
        return botData;
      });

      res.json({
        bots: botsWithoutTokens,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          pages: Math.ceil(result.total / filters.limit),
        },
      });
    } catch (error: any) {
      console.error('Error fetching bots list:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch bots list',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get bot details by ID
   * GET /bots/:id
   */
  static async getBotById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId || !id) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const bot = await BotModel.findById(id);

      if (!bot) {
        res.status(404).json({
          error: {
            code: 'BOT_NOT_FOUND',
            message: 'Bot not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Check if bot belongs to current user
      if (bot.user_id !== userId) {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have access to this bot',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Get bot statistics
      const stats = await BotModel.getBotStats(id);
      const activeModules = await BotModel.getActiveModules(id);

      // Remove sensitive data
      const { token_hash, ...botData } = bot;

      res.json({
        bot: botData,
        stats,
        active_modules: activeModules,
      });
    } catch (error: any) {
      console.error('Error fetching bot details:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch bot details',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Update bot settings
   * PUT /bots/:id/settings
   */
  static async updateBotSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId || !id) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Check if bot exists and belongs to user
      const existingBot = await BotModel.findById(id);
      if (!existingBot) {
        res.status(404).json({
          error: {
            code: 'BOT_NOT_FOUND',
            message: 'Bot not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (existingBot.user_id !== userId) {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have access to this bot',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const updateData: UpdateBotInput = req.body;
      const updatedBot = await BotModel.update(id, updateData);

      if (!updatedBot) {
        res.status(500).json({
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update bot settings',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Remove sensitive data
      const { token_hash, ...botData } = updatedBot;

      res.json({
        message: 'Bot settings updated successfully',
        bot: botData,
      });
    } catch (error: any) {
      console.error('Error updating bot settings:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update bot settings',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Delete bot
   * DELETE /bots/:id
   */
  static async deleteBot(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId || !id) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Check if bot exists and belongs to user
      const existingBot = await BotModel.findById(id);
      if (!existingBot) {
        res.status(404).json({
          error: {
            code: 'BOT_NOT_FOUND',
            message: 'Bot not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (existingBot.user_id !== userId) {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have access to this bot',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Get bot token for webhook cleanup
      const botToken = await BotModel.getDecryptedToken(id);

      // Delete webhook if bot token is available
      if (botToken) {
        try {
          await TelegramService.deleteWebhook(botToken);
        } catch (error) {
          console.warn('Failed to delete webhook during bot deletion:', error);
        }
      }

      // Deactivate all modules for this bot
      try {
        const activations = await BotModuleActivationModel.findByBotId(id);
        for (const activation of activations) {
          await BotModuleActivationModel.deactivate(activation.id);
        }
      } catch (error) {
        console.warn('Failed to deactivate modules during bot deletion:', error);
      }

      // Delete the bot
      const deleted = await BotModel.delete(id);

      if (!deleted) {
        res.status(500).json({
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to delete bot',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        message: 'Bot deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting bot:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete bot',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Check bot status
   * GET /bots/:id/status
   */
  static async checkBotStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId || !id) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Check if bot exists and belongs to user
      const bot = await BotModel.findById(id);
      if (!bot) {
        res.status(404).json({
          error: {
            code: 'BOT_NOT_FOUND',
            message: 'Bot not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (bot.user_id !== userId) {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You do not have access to this bot',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Get decrypted token and check status
      const botToken = await BotModel.getDecryptedToken(id);
      if (!botToken) {
        res.status(500).json({
          error: {
            code: 'TOKEN_ERROR',
            message: 'Failed to retrieve bot token',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const statusCheck = await TelegramService.checkBotStatus(botToken);
      const webhookInfo = await TelegramService.getWebhookInfo(botToken);

      res.json({
        bot_id: id,
        status: {
          is_accessible: statusCheck.isAccessible,
          error: statusCheck.error,
          bot_info: statusCheck.botInfo,
        },
        webhook: webhookInfo,
        last_checked: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Error checking bot status:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check bot status',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}