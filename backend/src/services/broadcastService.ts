import { NotificationModel, BroadcastNotification } from '../models/Notification';
import { BotModel } from '../models/Bot';
import { UserModel } from '../models/User';
import { TelegramService } from './telegramService';
import crypto from 'crypto';

export interface BroadcastTarget {
  botId: string;
  chatIds: (string | number)[];
}

export interface CreateBroadcastCampaignInput {
  userId: string;
  title: string;
  message: string;
  targets: BroadcastTarget[];
  scheduledAt?: Date;
  messageOptions?: {
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    disable_web_page_preview?: boolean;
    disable_notification?: boolean;
  };
}

export interface BroadcastStats {
  totalTargets: number;
  successfulSends: number;
  failedSends: number;
  deliveryRate: number;
}

export class BroadcastService {
  /**
   * Create a new broadcast campaign
   */
  static async createBroadcastCampaign(input: CreateBroadcastCampaignInput): Promise<BroadcastNotification> {
    const { userId, title, message, targets, scheduledAt, messageOptions } = input;

    // Validate user owns all the bots
    for (const target of targets) {
      const bot = await BotModel.findById(target.botId);
      if (!bot || bot.user_id !== userId) {
        throw new Error(`Bot ${target.botId} not found or access denied`);
      }
    }

    // Calculate total target count
    const totalTargets = targets.reduce((sum, target) => sum + target.chatIds.length, 0);

    // Create broadcast notification
    const broadcast = await NotificationModel.createBroadcast({
      title,
      message,
      type: 'system_announcement',
      target_audience: {
        user_id: userId,
        targets: targets.map(t => ({
          bot_id: t.botId,
          chat_count: t.chatIds.length
        }))
      },
      scheduled_at: scheduledAt,
      metadata: {
        message_options: messageOptions || {},
        targets: targets
      }
    });

    // Update with initial stats
    await NotificationModel.updateBroadcastStatus(broadcast.id, 'draft', {
      total_recipients: totalTargets
    });

    return broadcast;
  }

  /**
   * Execute a broadcast campaign
   */
  static async executeBroadcast(broadcastId: string): Promise<BroadcastStats> {
    const broadcast = await NotificationModel.getBroadcastById(broadcastId);
    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    if (broadcast.status !== 'draft' && broadcast.status !== 'scheduled') {
      throw new Error('Broadcast cannot be executed in current status');
    }

    // Update status to sending
    await NotificationModel.updateBroadcastStatus(broadcastId, 'sending');

    const targets = broadcast.metadata.targets as BroadcastTarget[];
    const messageOptions = broadcast.metadata.message_options || {};
    
    let totalSuccessful = 0;
    let totalFailed = 0;
    const allResults: any[] = [];

    try {
      // Execute broadcast for each bot
      for (const target of targets) {
        const bot = await BotModel.findById(target.botId);
        if (!bot) {
          console.error(`Bot ${target.botId} not found, skipping`);
          totalFailed += target.chatIds.length;
          continue;
        }

        // Decrypt bot token
        const botToken = this.decryptBotToken(bot.token_hash);
        
        // Send broadcast to all chat IDs for this bot
        const result = await TelegramService.sendBroadcast(
          botToken,
          target.chatIds,
          broadcast.message,
          {
            ...messageOptions,
            delay_between_messages: 200 // 200ms delay to avoid rate limiting
          }
        );

        totalSuccessful += result.successful;
        totalFailed += result.failed;
        allResults.push(...result.results);

        console.log(`Broadcast sent via bot ${bot.name}: ${result.successful}/${target.chatIds.length} successful`);
      }

      // Update broadcast status to completed
      await NotificationModel.updateBroadcastStatus(broadcastId, 'sent', {
        total_recipients: totalSuccessful + totalFailed,
        successful_sends: totalSuccessful,
        failed_sends: totalFailed
      });

      const stats: BroadcastStats = {
        totalTargets: totalSuccessful + totalFailed,
        successfulSends: totalSuccessful,
        failedSends: totalFailed,
        deliveryRate: totalSuccessful + totalFailed > 0 
          ? (totalSuccessful / (totalSuccessful + totalFailed)) * 100 
          : 0
      };

      console.log(`Broadcast ${broadcastId} completed:`, stats);
      return stats;

    } catch (error) {
      console.error(`Broadcast ${broadcastId} failed:`, error);
      
      // Update status to failed
      await NotificationModel.updateBroadcastStatus(broadcastId, 'failed', {
        total_recipients: totalSuccessful + totalFailed,
        successful_sends: totalSuccessful,
        failed_sends: totalFailed
      });

      throw error;
    }
  }

  /**
   * Get broadcast statistics
   */
  static async getBroadcastStats(broadcastId: string): Promise<BroadcastStats | null> {
    const broadcast = await NotificationModel.getBroadcastById(broadcastId);
    if (!broadcast) {
      return null;
    }

    return {
      totalTargets: broadcast.total_recipients,
      successfulSends: broadcast.successful_sends,
      failedSends: broadcast.failed_sends,
      deliveryRate: broadcast.total_recipients > 0 
        ? (broadcast.successful_sends / broadcast.total_recipients) * 100 
        : 0
    };
  }

  /**
   * Get user's broadcast campaigns
   */
  static async getUserBroadcasts(
    userId: string,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<BroadcastNotification[]> {
    // Get all broadcasts and filter by user
    const allBroadcasts = await NotificationModel.listBroadcasts(options);
    
    return allBroadcasts.filter(broadcast => {
      const targetAudience = broadcast.target_audience as any;
      return targetAudience.user_id === userId;
    });
  }

  /**
   * Cancel a scheduled broadcast
   */
  static async cancelBroadcast(broadcastId: string, userId: string): Promise<void> {
    const broadcast = await NotificationModel.getBroadcastById(broadcastId);
    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    // Check if user owns this broadcast
    const targetAudience = broadcast.target_audience as any;
    if (targetAudience.user_id !== userId) {
      throw new Error('Access denied');
    }

    if (broadcast.status !== 'draft' && broadcast.status !== 'scheduled') {
      throw new Error('Cannot cancel broadcast in current status');
    }

    await NotificationModel.updateBroadcastStatus(broadcastId, 'cancelled');
  }

  /**
   * Process scheduled broadcasts
   */
  static async processScheduledBroadcasts(): Promise<void> {
    try {
      const pendingBroadcasts = await NotificationModel.getPendingBroadcasts();
      
      for (const broadcast of pendingBroadcasts) {
        try {
          console.log(`Processing scheduled broadcast: ${broadcast.id}`);
          await this.executeBroadcast(broadcast.id);
        } catch (error) {
          console.error(`Failed to process broadcast ${broadcast.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to process scheduled broadcasts:', error);
    }
  }

  /**
   * Validate broadcast targets
   */
  static async validateBroadcastTargets(
    userId: string,
    targets: BroadcastTarget[]
  ): Promise<{
    valid: boolean;
    errors: string[];
    totalChatIds: number;
  }> {
    const errors: string[] = [];
    let totalChatIds = 0;

    for (const target of targets) {
      // Check if bot exists and belongs to user
      const bot = await BotModel.findById(target.botId);
      if (!bot) {
        errors.push(`Bot ${target.botId} not found`);
        continue;
      }

      if (bot.user_id !== userId) {
        errors.push(`Access denied to bot ${bot.name}`);
        continue;
      }

      if (bot.status !== 'active') {
        errors.push(`Bot ${bot.name} is not active`);
        continue;
      }

      // Validate chat IDs format
      if (!Array.isArray(target.chatIds) || target.chatIds.length === 0) {
        errors.push(`No chat IDs provided for bot ${bot.name}`);
        continue;
      }

      totalChatIds += target.chatIds.length;

      // Check for reasonable limits
      if (target.chatIds.length > 1000) {
        errors.push(`Too many chat IDs for bot ${bot.name} (max 1000 per bot)`);
      }
    }

    // Check total limits
    if (totalChatIds > 5000) {
      errors.push('Total chat IDs exceed maximum limit (5000)');
    }

    return {
      valid: errors.length === 0,
      errors,
      totalChatIds
    };
  }

  /**
   * Get broadcast delivery report
   */
  static async getBroadcastReport(broadcastId: string, userId: string): Promise<{
    broadcast: BroadcastNotification;
    stats: BroadcastStats;
    botBreakdown: Array<{
      botId: string;
      botName: string;
      totalSent: number;
      successful: number;
      failed: number;
    }>;
  } | null> {
    const broadcast = await NotificationModel.getBroadcastById(broadcastId);
    if (!broadcast) {
      return null;
    }

    // Check access
    const targetAudience = broadcast.target_audience as any;
    if (targetAudience.user_id !== userId) {
      throw new Error('Access denied');
    }

    const stats = await this.getBroadcastStats(broadcastId);
    if (!stats) {
      return null;
    }

    // Generate bot breakdown
    const targets = broadcast.metadata.targets as BroadcastTarget[];
    const botBreakdown = [];

    for (const target of targets) {
      const bot = await BotModel.findById(target.botId);
      if (bot) {
        botBreakdown.push({
          botId: target.botId,
          botName: bot.name,
          totalSent: target.chatIds.length,
          successful: 0, // This would need to be tracked per bot in a real implementation
          failed: 0
        });
      }
    }

    return {
      broadcast,
      stats,
      botBreakdown
    };
  }

  /**
   * Decrypt bot token (placeholder - implement proper encryption/decryption)
   */
  private static decryptBotToken(encryptedToken: string): string {
    // This is a placeholder. In a real implementation, you would decrypt the token
    // For now, assuming the token is stored as-is (which is not secure)
    return encryptedToken;
  }

  /**
   * Estimate broadcast cost (if implementing paid broadcasts)
   */
  static async estimateBroadcastCost(targets: BroadcastTarget[]): Promise<{
    totalMessages: number;
    estimatedCost: number;
    currency: string;
  }> {
    const totalMessages = targets.reduce((sum, target) => sum + target.chatIds.length, 0);
    
    // Example pricing: $0.001 per message
    const costPerMessage = 0.001;
    const estimatedCost = totalMessages * costPerMessage;

    return {
      totalMessages,
      estimatedCost,
      currency: 'USD'
    };
  }
}