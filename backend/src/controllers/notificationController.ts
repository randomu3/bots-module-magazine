import { Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { NotificationModel } from '../models/Notification';

export class NotificationController {
  /**
   * Get user notifications
   */
  static async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { type, page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const notifications = await NotificationService.getUserNotifications(userId, {
        type: type as any,
        limit: Number(limit),
        offset
      });

      res.json({
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: notifications.length
        }
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const count = await NotificationService.getUnreadCount(userId);
      res.json({ unread_count: count });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify notification belongs to user
      const notification = await NotificationModel.findById(id);
      if (!notification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      if (notification.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await NotificationService.markAsRead(id);
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const count = await NotificationService.markAllAsRead(userId);
      res.json({ message: `${count} notifications marked as read` });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get notification preferences
   */
  static async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const preferences = await NotificationService.getNotificationPreferences(userId);
      res.json({ preferences });
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const preferences = await NotificationService.updateNotificationPreferences(
        userId,
        req.body
      );

      res.json({ 
        message: 'Notification preferences updated',
        preferences 
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create broadcast notification (admin only)
   */
  static async createBroadcast(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { title, message, type, target_audience, scheduled_at } = req.body;

      if (!title || !message) {
        res.status(400).json({ error: 'Title and message are required' });
        return;
      }

      const broadcast = await NotificationService.createBroadcast({
        title,
        message,
        type,
        target_audience,
        scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined
      });

      res.status(201).json({ 
        message: 'Broadcast created successfully',
        broadcast 
      });
    } catch (error) {
      console.error('Error creating broadcast:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Send broadcast immediately (admin only)
   */
  static async sendBroadcast(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { id } = req.params;

      if (!userId || userRole !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      await NotificationService.sendBroadcast(id);
      res.json({ message: 'Broadcast sent successfully' });
    } catch (error) {
      console.error('Error sending broadcast:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get broadcast list (admin only)
   */
  static async getBroadcasts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { status, page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const broadcasts = await NotificationModel.listBroadcasts({
        status: status as string,
        limit: Number(limit),
        offset
      });

      res.json({
        broadcasts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: broadcasts.length
        }
      });
    } catch (error) {
      console.error('Error getting broadcasts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Test notification (admin only) - for testing email templates
   */
  static async testNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { type, target_user_id, data } = req.body;

      if (!type || !target_user_id) {
        res.status(400).json({ error: 'Type and target_user_id are required' });
        return;
      }

      await NotificationService.sendNotification(
        target_user_id,
        type,
        `Test ${type} notification`,
        `This is a test notification of type ${type}`,
        data || {}
      );

      res.json({ message: 'Test notification sent successfully' });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}