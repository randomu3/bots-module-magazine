import { Request, Response } from 'express';
import { BotSubscriberModel } from '../models/BotSubscriber';
import { BotModel } from '../models/Bot';

export class SubscriberController {
  /**
   * Get subscribers for a specific bot
   */
  static async getBotSubscribers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { botId } = req.params;
      const { is_active, chat_type, page = 1, limit = 50, search } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify bot ownership
      const bot = await BotModel.findById(botId);
      if (!bot || bot.user_id !== userId) {
        res.status(404).json({ error: 'Bot not found or access denied' });
        return;
      }

      const offset = (Number(page) - 1) * Number(limit);

      let subscribers;
      if (search) {
        subscribers = await BotSubscriberModel.searchSubscribers(botId, search as string, {
          limit: Number(limit),
          offset
        });
      } else {
        subscribers = await BotSubscriberModel.findByBotId(botId, {
          is_active: is_active !== undefined ? is_active === 'true' : undefined,
          chat_type: chat_type as string,
          limit: Number(limit),
          offset
        });
      }

      res.json({
        subscribers: subscribers.map(subscriber => ({
          id: subscriber.id,
          chat_id: subscriber.chat_id,
          chat_type: subscriber.chat_type,
          user_id: subscriber.user_id,
          username: subscriber.username,
          first_name: subscriber.first_name,
          last_name: subscriber.last_name,
          is_active: subscriber.is_active,
          subscribed_at: subscriber.subscribed_at,
          last_interaction: subscriber.last_interaction
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: subscribers.length
        }
      });
    } catch (error: any) {
      console.error('Error getting bot subscribers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get subscriber statistics for a bot
   */
  static async getBotSubscriberStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { botId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify bot ownership
      const bot = await BotModel.findById(botId);
      if (!bot || bot.user_id !== userId) {
        res.status(404).json({ error: 'Bot not found or access denied' });
        return;
      }

      const stats = await BotSubscriberModel.getSubscriberStats(botId);

      res.json({ stats });
    } catch (error: any) {
      console.error('Error getting subscriber stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Add a new subscriber to a bot
   */
  static async addSubscriber(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { botId } = req.params;
      const { chat_id, chat_type, user_id, username, first_name, last_name, metadata } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!chat_id || !chat_type) {
        res.status(400).json({ error: 'chat_id and chat_type are required' });
        return;
      }

      // Verify bot ownership
      const bot = await BotModel.findById(botId);
      if (!bot || bot.user_id !== userId) {
        res.status(404).json({ error: 'Bot not found or access denied' });
        return;
      }

      const subscriber = await BotSubscriberModel.create({
        bot_id: botId,
        chat_id,
        chat_type,
        user_id,
        username,
        first_name,
        last_name,
        metadata
      });

      res.status(201).json({
        message: 'Subscriber added successfully',
        subscriber: {
          id: subscriber.id,
          chat_id: subscriber.chat_id,
          chat_type: subscriber.chat_type,
          user_id: subscriber.user_id,
          username: subscriber.username,
          first_name: subscriber.first_name,
          last_name: subscriber.last_name,
          is_active: subscriber.is_active,
          subscribed_at: subscriber.subscribed_at
        }
      });
    } catch (error: any) {
      console.error('Error adding subscriber:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update a subscriber
   */
  static async updateSubscriber(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { botId, subscriberId } = req.params;
      const { username, first_name, last_name, is_active, metadata } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify bot ownership
      const bot = await BotModel.findById(botId);
      if (!bot || bot.user_id !== userId) {
        res.status(404).json({ error: 'Bot not found or access denied' });
        return;
      }

      // Verify subscriber belongs to this bot
      const existingSubscriber = await BotSubscriberModel.findById(subscriberId);
      if (!existingSubscriber || existingSubscriber.bot_id !== botId) {
        res.status(404).json({ error: 'Subscriber not found' });
        return;
      }

      const subscriber = await BotSubscriberModel.update(subscriberId, {
        username,
        first_name,
        last_name,
        is_active,
        metadata
      });

      res.json({
        message: 'Subscriber updated successfully',
        subscriber
      });
    } catch (error: any) {
      console.error('Error updating subscriber:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Deactivate a subscriber
   */
  static async deactivateSubscriber(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { botId, subscriberId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify bot ownership
      const bot = await BotModel.findById(botId);
      if (!bot || bot.user_id !== userId) {
        res.status(404).json({ error: 'Bot not found or access denied' });
        return;
      }

      // Verify subscriber belongs to this bot
      const existingSubscriber = await BotSubscriberModel.findById(subscriberId);
      if (!existingSubscriber || existingSubscriber.bot_id !== botId) {
        res.status(404).json({ error: 'Subscriber not found' });
        return;
      }

      await BotSubscriberModel.deactivate(subscriberId);

      res.json({ message: 'Subscriber deactivated successfully' });
    } catch (error: any) {
      console.error('Error deactivating subscriber:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get active chat IDs for broadcast targeting
   */
  static async getActiveChatIds(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { botId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify bot ownership
      const bot = await BotModel.findById(botId);
      if (!bot || bot.user_id !== userId) {
        res.status(404).json({ error: 'Bot not found or access denied' });
        return;
      }

      const chatIds = await BotSubscriberModel.getActiveChatIds(botId);

      res.json({
        chat_ids: chatIds,
        count: chatIds.length
      });
    } catch (error: any) {
      console.error('Error getting active chat IDs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Bulk deactivate subscribers
   */
  static async bulkDeactivateSubscribers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { botId } = req.params;
      const { chat_ids } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!Array.isArray(chat_ids) || chat_ids.length === 0) {
        res.status(400).json({ error: 'chat_ids array is required' });
        return;
      }

      // Verify bot ownership
      const bot = await BotModel.findById(botId);
      if (!bot || bot.user_id !== userId) {
        res.status(404).json({ error: 'Bot not found or access denied' });
        return;
      }

      const deactivatedCount = await BotSubscriberModel.bulkDeactivate(botId, chat_ids);

      res.json({
        message: `${deactivatedCount} subscribers deactivated successfully`,
        deactivated_count: deactivatedCount
      });
    } catch (error: any) {
      console.error('Error bulk deactivating subscribers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Import subscribers from CSV or other format
   */
  static async importSubscribers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { botId } = req.params;
      const { subscribers } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!Array.isArray(subscribers) || subscribers.length === 0) {
        res.status(400).json({ error: 'subscribers array is required' });
        return;
      }

      // Verify bot ownership
      const bot = await BotModel.findById(botId);
      if (!bot || bot.user_id !== userId) {
        res.status(404).json({ error: 'Bot not found or access denied' });
        return;
      }

      const results = {
        imported: 0,
        updated: 0,
        errors: [] as string[]
      };

      for (const subscriberData of subscribers) {
        try {
          if (!subscriberData.chat_id || !subscriberData.chat_type) {
            results.errors.push(`Missing chat_id or chat_type for subscriber: ${JSON.stringify(subscriberData)}`);
            continue;
          }

          await BotSubscriberModel.create({
            bot_id: botId,
            chat_id: subscriberData.chat_id,
            chat_type: subscriberData.chat_type,
            user_id: subscriberData.user_id,
            username: subscriberData.username,
            first_name: subscriberData.first_name,
            last_name: subscriberData.last_name,
            metadata: subscriberData.metadata || {}
          });

          results.imported++;
        } catch (error: any) {
          results.errors.push(`Failed to import subscriber ${subscriberData.chat_id}: ${error.message}`);
        }
      }

      res.json({
        message: 'Import completed',
        results
      });
    } catch (error: any) {
      console.error('Error importing subscribers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}