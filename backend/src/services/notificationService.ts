import { NotificationModel, NotificationType, CreateBroadcastInput } from '../models/Notification';
import { UserModel } from '../models/User';
import * as emailService from './emailService';

export interface NotificationData {
  amount?: number;
  currency?: string;
  description?: string;
  reason?: string;
  moduleName?: string;
  botName?: string;
  referralName?: string;
  ticketId?: string;
  [key: string]: any;
}

export class NotificationService {
  /**
   * Send a notification to a user
   */
  static async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: NotificationData = {}
  ): Promise<void> {
    try {
      // Get user information
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get user notification preferences
      const preferences = await NotificationModel.getUserNotificationPreferences(userId);

      // Check if user wants this type of notification
      if (!this.shouldSendNotification(type, preferences)) {
        console.log(`Notification ${type} skipped for user ${userId} due to preferences`);
        return;
      }

      // Create notification record
      const notification = await NotificationModel.create({
        user_id: userId,
        type,
        title,
        message,
        metadata: data
      });

      // Send email if user has email notifications enabled
      if (preferences.email_notifications) {
        await this.sendEmailNotification(user, type, notification.id, data);
      }

      console.log(`Notification ${type} sent to user ${userId}`);
    } catch (error) {
      console.error(`Failed to send notification ${type} to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send email notification based on type
   */
  private static async sendEmailNotification(
    user: any,
    type: NotificationType,
    notificationId: string,
    data: NotificationData
  ): Promise<void> {
    try {
      const { email, first_name } = user;

      switch (type) {
        case 'email_verification':
          if (data['token']) {
            await emailService.sendVerificationEmail(email, data['token'], first_name);
          }
          break;

        case 'password_reset':
          if (data['token']) {
            await emailService.sendPasswordResetEmail(email, data['token'], first_name);
          }
          break;

        case 'welcome':
          await emailService.sendWelcomeEmail(email, first_name);
          break;

        case 'payment_received':
          if (data.amount && data.currency && data.description) {
            await emailService.sendPaymentReceivedEmail(
              email,
              data.amount,
              data.currency,
              data.description,
              first_name
            );
          }
          break;

        case 'payment_failed':
          if (data.amount && data.currency && data.reason) {
            await emailService.sendPaymentFailedEmail(
              email,
              data.amount,
              data.currency,
              data.reason,
              first_name
            );
          }
          break;

        case 'withdrawal_requested':
          if (data.amount && data.currency) {
            await emailService.sendWithdrawalRequestedEmail(
              email,
              data.amount,
              data.currency,
              first_name
            );
          }
          break;

        case 'withdrawal_completed':
          if (data.amount && data.currency) {
            await emailService.sendWithdrawalCompletedEmail(
              email,
              data.amount,
              data.currency,
              first_name
            );
          }
          break;

        case 'withdrawal_failed':
          if (data.amount && data.currency && data.reason) {
            await emailService.sendWithdrawalFailedEmail(
              email,
              data.amount,
              data.currency,
              data.reason,
              first_name
            );
          }
          break;

        case 'module_activated':
          if (data.moduleName && data.botName) {
            await emailService.sendModuleActivatedEmail(
              email,
              data.moduleName,
              data.botName,
              first_name
            );
          }
          break;

        case 'referral_commission':
          if (data.amount && data.currency && data.referralName) {
            await emailService.sendReferralCommissionEmail(
              email,
              data.amount,
              data.currency,
              data.referralName,
              first_name
            );
          }
          break;

        default:
          console.log(`No email template for notification type: ${type}`);
          return;
      }

      // Mark notification as email sent
      await NotificationModel.markAsEmailSent(notificationId);
    } catch (error) {
      console.error(`Failed to send email for notification ${notificationId}:`, error);
      // Mark notification as failed
      await NotificationModel.updateStatus(notificationId, 'failed');
      throw error;
    }
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private static shouldSendNotification(
    type: NotificationType,
    preferences: any
  ): boolean {
    switch (type) {
      case 'email_verification':
      case 'password_reset':
      case 'welcome':
        return preferences.email_notifications;

      case 'payment_received':
      case 'payment_failed':
        return preferences.payment_notifications;

      case 'withdrawal_requested':
      case 'withdrawal_completed':
      case 'withdrawal_failed':
        return preferences.withdrawal_notifications;

      case 'module_activated':
      case 'module_expired':
        return preferences.module_notifications;

      case 'referral_commission':
        return preferences.referral_notifications;

      case 'system_announcement':
        return preferences.system_notifications;

      case 'support_ticket_created':
      case 'support_ticket_replied':
        return preferences.support_notifications;

      default:
        return true;
    }
  }

  /**
   * Send welcome notification after email verification
   */
  static async sendWelcomeNotification(userId: string): Promise<void> {
    await this.sendNotification(
      userId,
      'welcome',
      'Welcome to TeleBotics Platform!',
      'Your account has been verified and you can now start using our platform.'
    );
  }

  /**
   * Send payment received notification
   */
  static async sendPaymentReceivedNotification(
    userId: string,
    amount: number,
    currency: string,
    description: string
  ): Promise<void> {
    await this.sendNotification(
      userId,
      'payment_received',
      'Payment Received',
      `Your payment of ${amount} ${currency} has been successfully processed.`,
      { amount, currency, description }
    );
  }

  /**
   * Send payment failed notification
   */
  static async sendPaymentFailedNotification(
    userId: string,
    amount: number,
    currency: string,
    reason: string
  ): Promise<void> {
    await this.sendNotification(
      userId,
      'payment_failed',
      'Payment Failed',
      `Your payment of ${amount} ${currency} could not be processed.`,
      { amount, currency, reason }
    );
  }

  /**
   * Send withdrawal requested notification
   */
  static async sendWithdrawalRequestedNotification(
    userId: string,
    amount: number,
    currency: string
  ): Promise<void> {
    await this.sendNotification(
      userId,
      'withdrawal_requested',
      'Withdrawal Request Received',
      `Your withdrawal request for ${amount} ${currency} is being processed.`,
      { amount, currency }
    );
  }

  /**
   * Send withdrawal completed notification
   */
  static async sendWithdrawalCompletedNotification(
    userId: string,
    amount: number,
    currency: string
  ): Promise<void> {
    await this.sendNotification(
      userId,
      'withdrawal_completed',
      'Withdrawal Completed',
      `Your withdrawal of ${amount} ${currency} has been successfully processed.`,
      { amount, currency }
    );
  }

  /**
   * Send withdrawal failed notification
   */
  static async sendWithdrawalFailedNotification(
    userId: string,
    amount: number,
    currency: string,
    reason: string
  ): Promise<void> {
    await this.sendNotification(
      userId,
      'withdrawal_failed',
      'Withdrawal Failed',
      `Your withdrawal request for ${amount} ${currency} could not be processed.`,
      { amount, currency, reason }
    );
  }

  /**
   * Send module activated notification
   */
  static async sendModuleActivatedNotification(
    userId: string,
    moduleName: string,
    botName: string
  ): Promise<void> {
    await this.sendNotification(
      userId,
      'module_activated',
      'Module Activated',
      `The module "${moduleName}" has been activated for your bot "${botName}".`,
      { moduleName, botName }
    );
  }

  /**
   * Send referral commission notification
   */
  static async sendReferralCommissionNotification(
    userId: string,
    amount: number,
    currency: string,
    referralName: string
  ): Promise<void> {
    await this.sendNotification(
      userId,
      'referral_commission',
      'Referral Commission Earned',
      `You earned ${amount} ${currency} commission from your referral ${referralName}.`,
      { amount, currency, referralName }
    );
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    options: {
      type?: NotificationType;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    return await NotificationModel.findByUserId(userId, options);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    await NotificationModel.markAsRead(notificationId);
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    return await NotificationModel.markAllAsRead(userId);
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return await NotificationModel.getUnreadCount(userId);
  }

  /**
   * Update user notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: any
  ) {
    return await NotificationModel.updateUserNotificationPreferences(userId, preferences);
  }

  /**
   * Get user notification preferences
   */
  static async getNotificationPreferences(userId: string) {
    return await NotificationModel.getUserNotificationPreferences(userId);
  }

  /**
   * Create broadcast notification
   */
  static async createBroadcast(input: CreateBroadcastInput) {
    return await NotificationModel.createBroadcast(input);
  }

  /**
   * Send broadcast notification to all eligible users
   */
  static async sendBroadcast(broadcastId: string): Promise<void> {
    try {
      const broadcast = await NotificationModel.getBroadcastById(broadcastId);
      if (!broadcast) {
        throw new Error('Broadcast not found');
      }

      // Update status to sending
      await NotificationModel.updateBroadcastStatus(broadcastId, 'sending');

      // Get target users based on audience criteria
      const users = await this.getTargetUsers(broadcast.target_audience);
      
      let successCount = 0;
      let failCount = 0;

      // Send notifications to all target users
      for (const user of users) {
        try {
          await this.sendNotification(
            user.id,
            broadcast.type,
            broadcast.title,
            broadcast.message,
            broadcast.metadata
          );
          successCount++;
        } catch (error) {
          console.error(`Failed to send broadcast to user ${user.id}:`, error);
          failCount++;
        }
      }

      // Update broadcast status
      await NotificationModel.updateBroadcastStatus(broadcastId, 'sent', {
        total_recipients: users.length,
        successful_sends: successCount,
        failed_sends: failCount
      });

      console.log(`Broadcast ${broadcastId} sent to ${successCount}/${users.length} users`);
    } catch (error) {
      console.error(`Failed to send broadcast ${broadcastId}:`, error);
      await NotificationModel.updateBroadcastStatus(broadcastId, 'failed');
      throw error;
    }
  }

  /**
   * Get target users for broadcast based on audience criteria
   */
  private static async getTargetUsers(targetAudience: any): Promise<any[]> {
    const filters: any = {};

    if (targetAudience.all) {
      // Send to all users
      filters.email_verified = true;
    } else {
      if (targetAudience.roles) {
        filters.role = targetAudience.roles;
      }
      if (targetAudience.email_verified !== undefined) {
        filters.email_verified = targetAudience.email_verified;
      }
    }

    const result = await UserModel.list(filters);
    return result.users;
  }

  /**
   * Process pending broadcasts
   */
  static async processPendingBroadcasts(): Promise<void> {
    try {
      const pendingBroadcasts = await NotificationModel.getPendingBroadcasts();
      
      for (const broadcast of pendingBroadcasts) {
        try {
          await this.sendBroadcast(broadcast.id);
        } catch (error) {
          console.error(`Failed to process broadcast ${broadcast.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to process pending broadcasts:', error);
    }
  }
}