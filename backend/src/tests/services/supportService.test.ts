// Mock dependencies first
jest.mock('../../models/SupportTicket');
jest.mock('../../services/notificationService', () => ({
  NotificationService: {
    create: jest.fn()
  }
}));
jest.mock('../../services/emailService');
jest.mock('../../config/database', () => ({
  query: jest.fn()
}));

import { SupportService } from '../../services/supportService';
import { SupportTicketModel } from '../../models/SupportTicket';
import { NotificationService } from '../../services/notificationService';
import { sendSupportTicketConfirmation, sendSupportTicketStatusUpdate } from '../../services/emailService';
import pool from '../../config/database';

const mockSupportTicketModel = SupportTicketModel as jest.Mocked<typeof SupportTicketModel>;
const mockNotificationService = NotificationService as jest.Mocked<typeof NotificationService>;
const mockSendSupportTicketConfirmation = sendSupportTicketConfirmation as jest.MockedFunction<typeof sendSupportTicketConfirmation>;
const mockSendSupportTicketStatusUpdate = sendSupportTicketStatusUpdate as jest.MockedFunction<typeof sendSupportTicketStatusUpdate>;
const mockPool = pool as any;

describe('SupportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTicket', () => {
    const mockTicket = {
      id: 'ticket-1',
      user_id: 'user-1',
      subject: 'Test Issue',
      message: 'Test message',
      status: 'open',
      priority: 'normal',
      created_at: new Date(),
      updated_at: new Date()
    };

    const mockUser = {
      email: 'user@example.com',
      first_name: 'John'
    };

    it('should create a support ticket successfully', async () => {
      mockSupportTicketModel.create.mockResolvedValue(mockTicket);
      mockPool.query.mockResolvedValue({ rows: [mockUser] } as any);
      mockNotificationService.create.mockResolvedValue({} as any);
      mockSendSupportTicketConfirmation.mockResolvedValue();

      const input = {
        user_id: 'user-1',
        subject: 'Test Issue',
        message: 'Test message',
        priority: 'normal'
      };

      const result = await SupportService.createTicket(input);

      expect(mockSupportTicketModel.create).toHaveBeenCalledWith(input);
      expect(mockNotificationService.create).toHaveBeenCalledWith({
        user_id: mockTicket.user_id,
        type: 'support_ticket_created',
        title: 'Support Ticket Created',
        message: `Your support ticket "${mockTicket.subject}" has been created. We'll respond as soon as possible.`,
        metadata: {
          ticket_id: mockTicket.id,
          ticket_subject: mockTicket.subject,
          priority: mockTicket.priority
        }
      });
      expect(mockSendSupportTicketConfirmation).toHaveBeenCalledWith(
        mockTicket,
        mockUser.email,
        mockUser.first_name
      );
      expect(result).toEqual(mockTicket);
    });

    it('should handle errors during ticket creation', async () => {
      const error = new Error('Database error');
      mockSupportTicketModel.create.mockRejectedValue(error);

      const input = {
        user_id: 'user-1',
        subject: 'Test Issue',
        message: 'Test message'
      };

      await expect(SupportService.createTicket(input)).rejects.toThrow('Database error');
    });
  });

  describe('updateTicketStatus', () => {
    const mockTicket = {
      id: 'ticket-1',
      user_id: 'user-1',
      subject: 'Test Issue',
      message: 'Test message',
      status: 'resolved',
      priority: 'normal',
      created_at: new Date(),
      updated_at: new Date()
    };

    const mockUser = {
      email: 'user@example.com',
      first_name: 'John'
    };

    it('should update ticket status and send notifications', async () => {
      mockSupportTicketModel.updateStatus.mockResolvedValue(mockTicket);
      mockPool.query.mockResolvedValue({ rows: [mockUser] } as any);
      mockNotificationService.create.mockResolvedValue({} as any);
      mockSendSupportTicketStatusUpdate.mockResolvedValue();

      const result = await SupportService.updateTicketStatus('ticket-1', 'resolved', 'admin-1');

      expect(mockSupportTicketModel.updateStatus).toHaveBeenCalledWith('ticket-1', 'resolved');
      expect(mockNotificationService.create).toHaveBeenCalledWith({
        user_id: mockTicket.user_id,
        type: 'support_ticket_replied',
        title: 'Support Ticket Updated',
        message: `Your support ticket "${mockTicket.subject}" has been resolved. Please check the response.`,
        metadata: {
          ticket_id: mockTicket.id,
          ticket_subject: mockTicket.subject,
          new_status: 'resolved',
          updated_by: 'admin-1'
        }
      });
      expect(mockSendSupportTicketStatusUpdate).toHaveBeenCalledWith(
        mockTicket,
        'resolved',
        mockUser.email,
        mockUser.first_name
      );
      expect(result).toEqual(mockTicket);
    });

    it('should handle different status messages', async () => {
      mockSupportTicketModel.updateStatus.mockResolvedValue(mockTicket);
      mockPool.query.mockResolvedValue({ rows: [mockUser] } as any);
      mockNotificationService.create.mockResolvedValue({} as any);

      await SupportService.updateTicketStatus('ticket-1', 'in_progress');

      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Your support ticket "${mockTicket.subject}" is now being processed by our team.`
        })
      );
    });

    it('should return null if ticket not found', async () => {
      mockSupportTicketModel.updateStatus.mockResolvedValue(null);

      const result = await SupportService.updateTicketStatus('nonexistent', 'resolved');

      expect(result).toBeNull();
      expect(mockNotificationService.create).not.toHaveBeenCalled();
    });
  });

  describe('escalateCriticalTickets', () => {
    it('should escalate critical tickets older than 1 hour', async () => {
      const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const criticalTickets = {
        tickets: [
          {
            id: 'ticket-1',
            user_id: 'user-1',
            subject: 'Critical Issue',
            message: 'This is a critical issue',
            priority: 'critical',
            status: 'open',
            created_at: oldDate,
            updated_at: oldDate
          }
        ],
        total: 1
      };

      mockSupportTicketModel.list.mockResolvedValue(criticalTickets);
      mockSupportTicketModel.updateStatus.mockResolvedValue(criticalTickets.tickets[0] as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await SupportService.escalateCriticalTickets();

      expect(mockSupportTicketModel.list).toHaveBeenCalledWith({
        priority: 'critical',
        status: 'open'
      });
      expect(consoleSpy).toHaveBeenCalledWith('Escalated critical ticket ticket-1: Critical Issue');

      consoleSpy.mockRestore();
    });

    it('should not escalate recent critical tickets', async () => {
      const recentDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const criticalTickets = {
        tickets: [
          {
            id: 'ticket-1',
            user_id: 'user-1',
            subject: 'Critical Issue',
            message: 'This is a critical issue',
            priority: 'critical',
            status: 'open',
            created_at: recentDate,
            updated_at: recentDate
          }
        ],
        total: 1
      };

      mockSupportTicketModel.list.mockResolvedValue(criticalTickets);

      await SupportService.escalateCriticalTickets();

      expect(mockSupportTicketModel.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('getTicketStats', () => {
    it('should return ticket statistics', async () => {
      const mockStats = {
        total_tickets: 100,
        open_tickets: 20,
        in_progress_tickets: 15,
        resolved_tickets: 50,
        closed_tickets: 15
      };

      mockSupportTicketModel.getTicketStats.mockResolvedValue(mockStats);

      const result = await SupportService.getTicketStats();

      expect(mockSupportTicketModel.getTicketStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('getTicketsRequiringAttention', () => {
    it('should return open tickets sorted by priority', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          user_id: 'user-1',
          subject: 'Critical Issue',
          message: 'This is a critical issue',
          priority: 'critical',
          status: 'open',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockSupportTicketModel.list.mockResolvedValue({
        tickets: mockTickets,
        total: 1
      });

      const result = await SupportService.getTicketsRequiringAttention();

      expect(mockSupportTicketModel.list).toHaveBeenCalledWith({
        status: 'open',
        limit: 50,
        sort: 'priority',
        order: 'desc'
      });
      expect(result).toEqual(mockTickets);
    });
  });
});