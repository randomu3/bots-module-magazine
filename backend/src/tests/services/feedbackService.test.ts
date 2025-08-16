// Mock dependencies first
jest.mock('../../models/UserFeedback');
jest.mock('../../models/SupportQualityRating');
jest.mock('../../services/notificationService', () => ({
  NotificationService: {
    create: jest.fn()
  }
}));
jest.mock('../../services/emailService');
jest.mock('../../config/database', () => ({
  query: jest.fn()
}));

import { FeedbackService } from '../../services/feedbackService';
import { UserFeedbackModel } from '../../models/UserFeedback';
import { SupportQualityRatingModel } from '../../models/SupportQualityRating';
import { NotificationService } from '../../services/notificationService';
import { sendFeedbackConfirmation, sendFeedbackResponse } from '../../services/emailService';
import pool from '../../config/database';

const mockUserFeedbackModel = UserFeedbackModel as jest.Mocked<typeof UserFeedbackModel>;
const mockSupportQualityRatingModel = SupportQualityRatingModel as jest.Mocked<typeof SupportQualityRatingModel>;
const mockNotificationService = NotificationService as jest.Mocked<typeof NotificationService>;
const mockSendFeedbackConfirmation = sendFeedbackConfirmation as jest.MockedFunction<typeof sendFeedbackConfirmation>;
const mockSendFeedbackResponse = sendFeedbackResponse as jest.MockedFunction<typeof sendFeedbackResponse>;
const mockPool = pool as any;

describe('FeedbackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createFeedback', () => {
    const mockFeedback = {
      id: 'feedback-1',
      user_id: 'user-1',
      type: 'general',
      subject: 'Great platform!',
      message: 'I love using this platform',
      rating: 5,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };

    const mockUser = {
      email: 'user@example.com',
      first_name: 'John'
    };

    it('should create feedback successfully', async () => {
      mockUserFeedbackModel.create.mockResolvedValue(mockFeedback as any);
      mockPool.query.mockResolvedValue({ rows: [mockUser] });
      mockNotificationService.create.mockResolvedValue({} as any);
      mockSendFeedbackConfirmation.mockResolvedValue();

      const input = {
        user_id: 'user-1',
        type: 'general',
        subject: 'Great platform!',
        message: 'I love using this platform',
        rating: 5
      };

      const result = await FeedbackService.createFeedback(input);

      expect(mockUserFeedbackModel.create).toHaveBeenCalledWith(input);
      expect(mockNotificationService.create).toHaveBeenCalledWith({
        user_id: mockFeedback.user_id,
        type: 'system_announcement',
        title: 'Feedback Received',
        message: `Thank you for your feedback "${mockFeedback.subject}". We appreciate your input and will review it soon.`,
        metadata: {
          feedback_id: mockFeedback.id,
          feedback_subject: mockFeedback.subject,
          feedback_type: mockFeedback.type
        }
      });
      expect(mockSendFeedbackConfirmation).toHaveBeenCalledWith(
        mockFeedback,
        mockUser.email,
        mockUser.first_name
      );
      expect(result).toEqual(mockFeedback);
    });

    it('should handle errors during feedback creation', async () => {
      const error = new Error('Database error');
      mockUserFeedbackModel.create.mockRejectedValue(error);

      const input = {
        user_id: 'user-1',
        subject: 'Test feedback',
        message: 'Test message'
      };

      await expect(FeedbackService.createFeedback(input)).rejects.toThrow('Database error');
    });
  });

  describe('updateFeedback', () => {
    const mockFeedback = {
      id: 'feedback-1',
      user_id: 'user-1',
      type: 'general',
      subject: 'Great platform!',
      message: 'I love using this platform',
      status: 'responded',
      admin_response: 'Thank you for your feedback!',
      created_at: new Date(),
      updated_at: new Date()
    };

    const mockUser = {
      email: 'user@example.com',
      first_name: 'John'
    };

    it('should update feedback and send notifications when admin responds', async () => {
      mockUserFeedbackModel.update.mockResolvedValue(mockFeedback as any);
      mockPool.query.mockResolvedValue({ rows: [mockUser] });
      mockNotificationService.create.mockResolvedValue({} as any);
      mockSendFeedbackResponse.mockResolvedValue();

      const input = {
        status: 'responded',
        admin_response: 'Thank you for your feedback!'
      };

      const result = await FeedbackService.updateFeedback('feedback-1', input, 'admin-1');

      expect(mockUserFeedbackModel.update).toHaveBeenCalledWith('feedback-1', {
        ...input,
        admin_user_id: 'admin-1'
      });
      expect(mockNotificationService.create).toHaveBeenCalledWith({
        user_id: mockFeedback.user_id,
        type: 'system_announcement',
        title: 'Feedback Response',
        message: `We've responded to your feedback "${mockFeedback.subject}". Please check your email for details.`,
        metadata: {
          feedback_id: mockFeedback.id,
          feedback_subject: mockFeedback.subject,
          responded_by: 'admin-1'
        }
      });
      expect(mockSendFeedbackResponse).toHaveBeenCalledWith(
        mockFeedback,
        mockUser.email,
        mockUser.first_name
      );
      expect(result).toEqual(mockFeedback);
    });

    it('should return null if feedback not found', async () => {
      mockUserFeedbackModel.update.mockResolvedValue(null);

      const result = await FeedbackService.updateFeedback('nonexistent', { status: 'reviewed' });

      expect(result).toBeNull();
      expect(mockNotificationService.create).not.toHaveBeenCalled();
    });
  });

  describe('createSupportQualityRating', () => {
    const mockRating = {
      id: 'rating-1',
      ticket_id: 'ticket-1',
      user_id: 'user-1',
      rating: 5,
      feedback_text: 'Excellent support!',
      created_at: new Date()
    };

    it('should create support quality rating successfully', async () => {
      mockSupportQualityRatingModel.create.mockResolvedValue(mockRating as any);
      mockNotificationService.create.mockResolvedValue({} as any);

      const input = {
        ticket_id: 'ticket-1',
        user_id: 'user-1',
        rating: 5,
        feedback_text: 'Excellent support!'
      };

      const result = await FeedbackService.createSupportQualityRating(input);

      expect(mockSupportQualityRatingModel.create).toHaveBeenCalledWith(input);
      expect(mockNotificationService.create).toHaveBeenCalledWith({
        user_id: input.user_id,
        type: 'system_announcement',
        title: 'Support Quality Rating Submitted',
        message: 'Thank you for rating our support service. Your feedback helps us improve.',
        metadata: {
          rating_id: mockRating.id,
          ticket_id: mockRating.ticket_id,
          rating: mockRating.rating
        }
      });
      expect(result).toEqual(mockRating);
    });

    it('should handle duplicate rating error', async () => {
      const error = new Error('Rating already exists for this ticket');
      mockSupportQualityRatingModel.create.mockRejectedValue(error);

      const input = {
        ticket_id: 'ticket-1',
        user_id: 'user-1',
        rating: 5
      };

      await expect(FeedbackService.createSupportQualityRating(input)).rejects.toThrow('Rating already exists for this ticket');
    });
  });

  describe('getFeedbackStats', () => {
    it('should return feedback statistics', async () => {
      const mockStats = {
        total_feedback: 100,
        pending_feedback: 20,
        reviewed_feedback: 30,
        responded_feedback: 40,
        closed_feedback: 10,
        average_rating: 4.2
      };

      mockUserFeedbackModel.getFeedbackStats.mockResolvedValue(mockStats);

      const result = await FeedbackService.getFeedbackStats();

      expect(mockUserFeedbackModel.getFeedbackStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('getSupportQualityStats', () => {
    it('should return support quality statistics', async () => {
      const mockStats = {
        total_ratings: 50,
        average_rating: 4.5,
        rating_distribution: [
          { rating: 1, count: 2 },
          { rating: 2, count: 3 },
          { rating: 3, count: 5 },
          { rating: 4, count: 15 },
          { rating: 5, count: 25 }
        ]
      };

      mockSupportQualityRatingModel.getSupportQualityStats.mockResolvedValue(mockStats);

      const result = await FeedbackService.getSupportQualityStats();

      expect(mockSupportQualityRatingModel.getSupportQualityStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('getFeedbackRequiringAttention', () => {
    it('should return pending feedback sorted by creation date', async () => {
      const mockFeedback = [
        {
          id: 'feedback-1',
          user_id: 'user-1',
          subject: 'Bug report',
          type: 'bug_report',
          status: 'pending',
          created_at: new Date()
        }
      ];

      mockUserFeedbackModel.list.mockResolvedValue({
        feedback: mockFeedback as any,
        total: 1
      });

      const result = await FeedbackService.getFeedbackRequiringAttention();

      expect(mockUserFeedbackModel.list).toHaveBeenCalledWith({
        status: 'pending',
        limit: 50,
        sort: 'created_at',
        order: 'asc'
      });
      expect(result).toEqual(mockFeedback);
    });
  });
});