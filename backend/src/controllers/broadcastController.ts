import { Request, Response } from 'express';
import { BroadcastService, CreateBroadcastCampaignInput } from '../services/broadcastService';

export class BroadcastController {
  /**
   * Create a new broadcast campaign
   */
  static async createBroadcast(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { title, message, targets, scheduled_at, message_options } = req.body;

      if (!title || !message || !targets || !Array.isArray(targets)) {
        res.status(400).json({ 
          error: 'Title, message, and targets are required' 
        });
        return;
      }

      // Validate targets
      const validation = await BroadcastService.validateBroadcastTargets(userId, targets);
      if (!validation.valid) {
        res.status(400).json({ 
          error: 'Invalid broadcast targets',
          details: validation.errors
        });
        return;
      }

      const broadcastInput: CreateBroadcastCampaignInput = {
        userId,
        title,
        message,
        targets,
        scheduledAt: scheduled_at ? new Date(scheduled_at) : undefined,
        messageOptions: message_options
      };

      const broadcast = await BroadcastService.createBroadcastCampaign(broadcastInput);

      res.status(201).json({
        message: 'Broadcast campaign created successfully',
        broadcast: {
          id: broadcast.id,
          title: broadcast.title,
          message: broadcast.message,
          status: broadcast.status,
          total_recipients: broadcast.total_recipients,
          scheduled_at: broadcast.scheduled_at,
          created_at: broadcast.created_at
        }
      });
    } catch (error: any) {
      console.error('Error creating broadcast:', error);
      res.status(500).json({ 
        error: error.message || 'Internal server error' 
      });
    }
  }

  /**
   * Get user's broadcast campaigns
   */
  static async getUserBroadcasts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { status, page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const broadcasts = await BroadcastService.getUserBroadcasts(userId, {
        status: status as string,
        limit: Number(limit),
        offset
      });

      res.json({
        broadcasts: broadcasts.map(broadcast => ({
          id: broadcast.id,
          title: broadcast.title,
          message: broadcast.message,
          status: broadcast.status,
          total_recipients: broadcast.total_recipients,
          successful_sends: broadcast.successful_sends,
          failed_sends: broadcast.failed_sends,
          scheduled_at: broadcast.scheduled_at,
          sent_at: broadcast.sent_at,
          created_at: broadcast.created_at
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: broadcasts.length
        }
      });
    } catch (error: any) {
      console.error('Error getting user broadcasts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Execute a broadcast campaign
   */
  static async executeBroadcast(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify user owns this broadcast
      const broadcasts = await BroadcastService.getUserBroadcasts(userId);
      const broadcast = broadcasts.find(b => b.id === id);
      
      if (!broadcast) {
        res.status(404).json({ error: 'Broadcast not found' });
        return;
      }

      const stats = await BroadcastService.executeBroadcast(id);

      res.json({
        message: 'Broadcast executed successfully',
        stats
      });
    } catch (error: any) {
      console.error('Error executing broadcast:', error);
      res.status(500).json({ 
        error: error.message || 'Internal server error' 
      });
    }
  }

  /**
   * Get broadcast statistics
   */
  static async getBroadcastStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify user owns this broadcast
      const broadcasts = await BroadcastService.getUserBroadcasts(userId);
      const broadcast = broadcasts.find(b => b.id === id);
      
      if (!broadcast) {
        res.status(404).json({ error: 'Broadcast not found' });
        return;
      }

      const stats = await BroadcastService.getBroadcastStats(id);
      if (!stats) {
        res.status(404).json({ error: 'Broadcast statistics not found' });
        return;
      }

      res.json({ stats });
    } catch (error: any) {
      console.error('Error getting broadcast stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Cancel a scheduled broadcast
   */
  static async cancelBroadcast(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await BroadcastService.cancelBroadcast(id, userId);

      res.json({ message: 'Broadcast cancelled successfully' });
    } catch (error: any) {
      console.error('Error cancelling broadcast:', error);
      res.status(500).json({ 
        error: error.message || 'Internal server error' 
      });
    }
  }

  /**
   * Get detailed broadcast report
   */
  static async getBroadcastReport(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const report = await BroadcastService.getBroadcastReport(id, userId);
      if (!report) {
        res.status(404).json({ error: 'Broadcast report not found' });
        return;
      }

      res.json({ report });
    } catch (error: any) {
      console.error('Error getting broadcast report:', error);
      res.status(500).json({ 
        error: error.message || 'Internal server error' 
      });
    }
  }

  /**
   * Validate broadcast targets
   */
  static async validateTargets(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { targets } = req.body;

      if (!targets || !Array.isArray(targets)) {
        res.status(400).json({ error: 'Targets array is required' });
        return;
      }

      const validation = await BroadcastService.validateBroadcastTargets(userId, targets);

      res.json({
        valid: validation.valid,
        errors: validation.errors,
        total_chat_ids: validation.totalChatIds
      });
    } catch (error: any) {
      console.error('Error validating targets:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Estimate broadcast cost
   */
  static async estimateCost(req: Request, res: Response): Promise<void> {
    try {
      const { targets } = req.body;

      if (!targets || !Array.isArray(targets)) {
        res.status(400).json({ error: 'Targets array is required' });
        return;
      }

      const estimate = await BroadcastService.estimateBroadcastCost(targets);

      res.json({ estimate });
    } catch (error: any) {
      console.error('Error estimating cost:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get broadcast templates (predefined message templates)
   */
  static async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = [
        {
          id: 'welcome',
          name: 'Welcome Message',
          category: 'onboarding',
          template: 'Welcome to our service! 🎉\n\nWe\'re excited to have you on board. Here\'s what you can do:\n\n• Feature 1\n• Feature 2\n• Feature 3\n\nGet started now!'
        },
        {
          id: 'announcement',
          name: 'General Announcement',
          category: 'updates',
          template: '📢 Important Announcement\n\n[Your announcement here]\n\nThank you for your attention!'
        },
        {
          id: 'promotion',
          name: 'Promotional Message',
          category: 'marketing',
          template: '🔥 Special Offer!\n\n[Offer details]\n\n⏰ Limited time only!\n\nDon\'t miss out!'
        },
        {
          id: 'maintenance',
          name: 'Maintenance Notice',
          category: 'technical',
          template: '🔧 Scheduled Maintenance\n\nWe will be performing maintenance on [date] from [time] to [time].\n\nDuring this time, some features may be unavailable.\n\nThank you for your patience!'
        }
      ];

      res.json({ templates });
    } catch (error: any) {
      console.error('Error getting templates:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}