import { Request, Response } from 'express';
import { FeedbackService } from '../services/feedbackService';
import { createUserFeedbackSchema, updateUserFeedbackSchema, createSupportQualityRatingSchema, paginationSchema } from '../validation/schemas';

export class FeedbackController {
  /**
   * Create user feedback
   */
  static async createFeedback(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      const { error, value } = createUserFeedbackSchema.validate({
        ...req.body,
        user_id: userId
      });

      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid input'
          }
        });
        return;
      }

      const feedback = await FeedbackService.createFeedback(value);

      res.status(201).json({
        success: true,
        data: feedback,
        message: 'Feedback submitted successfully'
      });
    } catch (error: any) {
      console.error('Error creating feedback:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to submit feedback'
        }
      });
    }
  }

  /**
   * Get feedback by ID (user can only access their own feedback)
   */
  static async getFeedback(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const feedbackId = req.params.id;

      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      const feedback = await FeedbackService.getFeedbackById(feedbackId);

      if (!feedback) {
        res.status(404).json({
          error: {
            code: 'FEEDBACK_NOT_FOUND',
            message: 'Feedback not found'
          }
        });
        return;
      }

      // Users can only access their own feedback, admins can access all
      if (userRole !== 'admin' && feedback.user_id !== userId) {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only access your own feedback'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: feedback
      });
    } catch (error: any) {
      console.error('Error getting feedback:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get feedback'
        }
      });
    }
  }

  /**
   * Get user's feedback
   */
  static async getUserFeedback(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      const feedback = await FeedbackService.getFeedbackByUserId(userId);

      res.json({
        success: true,
        data: feedback
      });
    } catch (error: any) {
      console.error('Error getting user feedback:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get feedback'
        }
      });
    }
  }

  /**
   * Update feedback (admin only)
   */
  static async updateFeedback(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const feedbackId = req.params.id;

      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      if (userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only administrators can update feedback'
          }
        });
        return;
      }

      const { error, value } = updateUserFeedbackSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid input'
          }
        });
        return;
      }

      const feedback = await FeedbackService.updateFeedback(feedbackId, value, userId);

      if (!feedback) {
        res.status(404).json({
          error: {
            code: 'FEEDBACK_NOT_FOUND',
            message: 'Feedback not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: feedback,
        message: 'Feedback updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating feedback:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update feedback'
        }
      });
    }
  }

  /**
   * Delete feedback (admin only)
   */
  static async deleteFeedback(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const feedbackId = req.params.id;

      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      if (userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only administrators can delete feedback'
          }
        });
        return;
      }

      const deleted = await FeedbackService.deleteFeedback(feedbackId);

      if (!deleted) {
        res.status(404).json({
          error: {
            code: 'FEEDBACK_NOT_FOUND',
            message: 'Feedback not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        message: 'Feedback deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting feedback:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete feedback'
        }
      });
    }
  }

  /**
   * List all feedback with filters (admin only)
   */
  static async listFeedback(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      if (userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only administrators can list all feedback'
          }
        });
        return;
      }

      const { error, value } = paginationSchema.validate(req.query);

      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid query parameters'
          }
        });
        return;
      }

      const filters = {
        ...value,
        user_id: req.query.user_id as string,
        type: req.query.type as string,
        status: req.query.status as string,
        rating: req.query.rating ? parseInt(req.query.rating as string) : undefined
      };

      const result = await FeedbackService.listFeedback(filters);

      res.json({
        success: true,
        data: result.feedback,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          pages: Math.ceil(result.total / filters.limit)
        }
      });
    } catch (error: any) {
      console.error('Error listing feedback:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list feedback'
        }
      });
    }
  }

  /**
   * Get feedback statistics (admin only)
   */
  static async getFeedbackStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      if (userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only administrators can view feedback statistics'
          }
        });
        return;
      }

      const [stats, byType] = await Promise.all([
        FeedbackService.getFeedbackStats(),
        FeedbackService.getFeedbackByType()
      ]);

      res.json({
        success: true,
        data: {
          ...stats,
          by_type: byType
        }
      });
    } catch (error: any) {
      console.error('Error getting feedback stats:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get feedback statistics'
        }
      });
    }
  }

  /**
   * Get feedback requiring attention (admin only)
   */
  static async getFeedbackRequiringAttention(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      if (userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only administrators can view feedback requiring attention'
          }
        });
        return;
      }

      const feedback = await FeedbackService.getFeedbackRequiringAttention();

      res.json({
        success: true,
        data: feedback
      });
    } catch (error: any) {
      console.error('Error getting feedback requiring attention:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get feedback requiring attention'
        }
      });
    }
  }

  /**
   * Create support quality rating
   */
  static async createSupportQualityRating(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      const { error, value } = createSupportQualityRatingSchema.validate({
        ...req.body,
        user_id: userId
      });

      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid input'
          }
        });
        return;
      }

      const rating = await FeedbackService.createSupportQualityRating(value);

      res.status(201).json({
        success: true,
        data: rating,
        message: 'Support quality rating submitted successfully'
      });
    } catch (error: any) {
      console.error('Error creating support quality rating:', error);
      
      if (error.message === 'Rating already exists for this ticket') {
        res.status(409).json({
          error: {
            code: 'RATING_EXISTS',
            message: 'You have already rated this support ticket'
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to submit support quality rating'
        }
      });
    }
  }

  /**
   * Get support quality statistics (admin only)
   */
  static async getSupportQualityStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      if (userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only administrators can view support quality statistics'
          }
        });
        return;
      }

      const stats = await FeedbackService.getSupportQualityStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting support quality stats:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get support quality statistics'
        }
      });
    }
  }
}