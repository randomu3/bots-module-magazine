import { UserFeedbackModel, CreateUserFeedbackInput, UpdateUserFeedbackInput } from '../models/UserFeedback';
import { SupportQualityRatingModel, CreateSupportQualityRatingInput } from '../models/SupportQualityRating';
import { UserFeedback, SupportQualityRating } from '../types/database';
import { NotificationService } from './notificationService';
import { sendFeedbackConfirmation, sendFeedbackResponse } from './emailService';
import pool from '../config/database';

export class FeedbackService {
  /**
   * Create user feedback
   */
  static async createFeedback(input: CreateUserFeedbackInput): Promise<UserFeedback> {
    try {
      // Create the feedback
      const feedback = await UserFeedbackModel.create(input);

      // Send confirmation notification to user
      await NotificationService.create({
        user_id: feedback.user_id,
        type: 'system_announcement',
        title: 'Feedback Received',
        message: `Thank you for your feedback "${feedback.subject}". We appreciate your input and will review it soon.`,
        metadata: {
          feedback_id: feedback.id,
          feedback_subject: feedback.subject,
          feedback_type: feedback.type
        }
      });

      // Get user info for email
      const userQuery = 'SELECT email, first_name FROM users WHERE id = $1';
      const userResult = await pool.query(userQuery, [feedback.user_id]);
      const user = userResult.rows[0];

      if (user) {
        // Send confirmation email
        await sendFeedbackConfirmation(feedback, user.email, user.first_name);
      }

      return feedback;
    } catch (error) {
      console.error('Error creating feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback by ID
   */
  static async getFeedbackById(id: string): Promise<UserFeedback | null> {
    return await UserFeedbackModel.findById(id);
  }

  /**
   * Get feedback by user ID
   */
  static async getFeedbackByUserId(userId: string): Promise<UserFeedback[]> {
    return await UserFeedbackModel.findByUserId(userId);
  }

  /**
   * Update feedback (admin only)
   */
  static async updateFeedback(id: string, input: UpdateUserFeedbackInput, adminUserId?: string): Promise<UserFeedback | null> {
    try {
      // Add admin user ID if provided
      if (adminUserId) {
        input.admin_user_id = adminUserId;
      }

      const feedback = await UserFeedbackModel.update(id, input);
      
      if (feedback && input.admin_response) {
        // Send notification to user about response
        await NotificationService.create({
          user_id: feedback.user_id,
          type: 'system_announcement',
          title: 'Feedback Response',
          message: `We've responded to your feedback "${feedback.subject}". Please check your email for details.`,
          metadata: {
            feedback_id: feedback.id,
            feedback_subject: feedback.subject,
            responded_by: adminUserId
          }
        });

        // Get user info for email
        const userQuery = 'SELECT email, first_name FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [feedback.user_id]);
        const user = userResult.rows[0];

        if (user) {
          // Send response email
          await sendFeedbackResponse(feedback, user.email, user.first_name);
        }
      }

      return feedback;
    } catch (error) {
      console.error('Error updating feedback:', error);
      throw error;
    }
  }

  /**
   * Delete feedback
   */
  static async deleteFeedback(id: string): Promise<boolean> {
    return await UserFeedbackModel.delete(id);
  }

  /**
   * List feedback with filters (for admin)
   */
  static async listFeedback(filters: {
    user_id?: string;
    type?: string;
    status?: string;
    rating?: number;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<{ feedback: UserFeedback[]; total: number }> {
    return await UserFeedbackModel.list(filters);
  }

  /**
   * Get feedback statistics (for admin dashboard)
   */
  static async getFeedbackStats(): Promise<{
    total_feedback: number;
    pending_feedback: number;
    reviewed_feedback: number;
    responded_feedback: number;
    closed_feedback: number;
    average_rating: number;
  }> {
    return await UserFeedbackModel.getFeedbackStats();
  }

  /**
   * Get feedback by type statistics
   */
  static async getFeedbackByType(): Promise<Array<{ type: string; count: number; average_rating: number }>> {
    return await UserFeedbackModel.getFeedbackByType();
  }

  /**
   * Create support quality rating
   */
  static async createSupportQualityRating(input: CreateSupportQualityRatingInput): Promise<SupportQualityRating> {
    try {
      const rating = await SupportQualityRatingModel.create(input);

      // Send notification to admins about the rating
      await NotificationService.create({
        user_id: input.user_id,
        type: 'system_announcement',
        title: 'Support Quality Rating Submitted',
        message: `Thank you for rating our support service. Your feedback helps us improve.`,
        metadata: {
          rating_id: rating.id,
          ticket_id: rating.ticket_id,
          rating: rating.rating
        }
      });

      return rating;
    } catch (error) {
      console.error('Error creating support quality rating:', error);
      throw error;
    }
  }

  /**
   * Get support quality rating by ticket ID
   */
  static async getSupportQualityRatingByTicketId(ticketId: string): Promise<SupportQualityRating | null> {
    return await SupportQualityRatingModel.findByTicketId(ticketId);
  }

  /**
   * Get support quality ratings by user ID
   */
  static async getSupportQualityRatingsByUserId(userId: string): Promise<SupportQualityRating[]> {
    return await SupportQualityRatingModel.findByUserId(userId);
  }

  /**
   * List support quality ratings with filters (for admin)
   */
  static async listSupportQualityRatings(filters: {
    ticket_id?: string;
    user_id?: string;
    rating?: number;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<{ ratings: SupportQualityRating[]; total: number }> {
    return await SupportQualityRatingModel.list(filters);
  }

  /**
   * Get support quality statistics
   */
  static async getSupportQualityStats(): Promise<{
    total_ratings: number;
    average_rating: number;
    rating_distribution: Array<{ rating: number; count: number }>;
  }> {
    return await SupportQualityRatingModel.getSupportQualityStats();
  }

  /**
   * Delete support quality rating
   */
  static async deleteSupportQualityRating(id: string): Promise<boolean> {
    return await SupportQualityRatingModel.delete(id);
  }

  /**
   * Get pending feedback requiring attention (for admin dashboard)
   */
  static async getFeedbackRequiringAttention(): Promise<UserFeedback[]> {
    const filters = {
      status: 'pending',
      limit: 50,
      sort: 'created_at',
      order: 'asc' as const
    };

    const result = await UserFeedbackModel.list(filters);
    return result.feedback;
  }
}