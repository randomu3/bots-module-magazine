import { SupportTicketModel, CreateSupportTicketInput, UpdateSupportTicketInput } from '../models/SupportTicket';
import { SupportTicket } from '../types/database';
import { NotificationService } from './notificationService';
import { EmailService, sendSupportTicketConfirmation, sendSupportTicketStatusUpdate } from './emailService';
import pool from '../config/database';

export class SupportService {
  /**
   * Create a new support ticket
   */
  static async createTicket(input: CreateSupportTicketInput): Promise<SupportTicket> {
    try {
      // Create the ticket
      const ticket = await SupportTicketModel.create(input);

      // Send confirmation notification to user
      await NotificationService.create({
        user_id: ticket.user_id,
        type: 'support_ticket_created',
        title: 'Support Ticket Created',
        message: `Your support ticket "${ticket.subject}" has been created. We'll respond as soon as possible.`,
        metadata: {
          ticket_id: ticket.id,
          ticket_subject: ticket.subject,
          priority: ticket.priority
        }
      });

      // Get user info for email
      const userQuery = 'SELECT email, first_name FROM users WHERE id = $1';
      const userResult = await pool.query(userQuery, [ticket.user_id]);
      const user = userResult.rows[0];

      if (user) {
        // Send confirmation email
        await sendSupportTicketConfirmation(ticket, user.email, user.first_name);
      }

      return ticket;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw error;
    }
  }

  /**
   * Get ticket by ID
   */
  static async getTicketById(id: string): Promise<SupportTicket | null> {
    return await SupportTicketModel.findById(id);
  }

  /**
   * Get tickets by user ID
   */
  static async getTicketsByUserId(userId: string): Promise<SupportTicket[]> {
    return await SupportTicketModel.findByUserId(userId);
  }

  /**
   * Update ticket status
   */
  static async updateTicketStatus(id: string, status: string, adminUserId?: string): Promise<SupportTicket | null> {
    try {
      const ticket = await SupportTicketModel.updateStatus(id, status);
      
      if (ticket) {
        // Send notification to user about status change
        let notificationMessage = '';
        switch (status) {
          case 'in_progress':
            notificationMessage = `Your support ticket "${ticket.subject}" is now being processed by our team.`;
            break;
          case 'resolved':
            notificationMessage = `Your support ticket "${ticket.subject}" has been resolved. Please check the response.`;
            break;
          case 'closed':
            notificationMessage = `Your support ticket "${ticket.subject}" has been closed.`;
            break;
          default:
            notificationMessage = `Your support ticket "${ticket.subject}" status has been updated to ${status}.`;
        }

        await NotificationService.create({
          user_id: ticket.user_id,
          type: 'support_ticket_replied',
          title: 'Support Ticket Updated',
          message: notificationMessage,
          metadata: {
            ticket_id: ticket.id,
            ticket_subject: ticket.subject,
            new_status: status,
            updated_by: adminUserId
          }
        });

        // Send email notification for important status changes
        if (status === 'resolved' || status === 'closed') {
          // Get user info for email
          const userQuery = 'SELECT email, first_name FROM users WHERE id = $1';
          const userResult = await pool.query(userQuery, [ticket.user_id]);
          const user = userResult.rows[0];

          if (user) {
            await sendSupportTicketStatusUpdate(ticket, status, user.email, user.first_name);
          }
        }
      }

      return ticket;
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  }

  /**
   * Update ticket details
   */
  static async updateTicket(id: string, input: UpdateSupportTicketInput): Promise<SupportTicket | null> {
    return await SupportTicketModel.update(id, input);
  }

  /**
   * Delete ticket
   */
  static async deleteTicket(id: string): Promise<boolean> {
    return await SupportTicketModel.delete(id);
  }

  /**
   * List tickets with filters (for admin)
   */
  static async listTickets(filters: {
    user_id?: string;
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<{ tickets: SupportTicket[]; total: number }> {
    return await SupportTicketModel.list(filters);
  }

  /**
   * Get ticket statistics (for admin dashboard)
   */
  static async getTicketStats(): Promise<{
    total_tickets: number;
    open_tickets: number;
    in_progress_tickets: number;
    resolved_tickets: number;
    closed_tickets: number;
  }> {
    return await SupportTicketModel.getTicketStats();
  }

  /**
   * Auto-escalate critical tickets
   */
  static async escalateCriticalTickets(): Promise<void> {
    try {
      // Get all critical tickets that are still open and older than 1 hour
      const criticalTickets = await SupportTicketModel.list({
        priority: 'critical',
        status: 'open'
      });

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      for (const ticket of criticalTickets.tickets) {
        if (new Date(ticket.created_at) < oneHourAgo) {
          // Update status to in_progress to indicate escalation
          await this.updateTicketStatus(ticket.id, 'in_progress');
          
          // Send escalation notification to admins
          // This would typically send to all admin users
          console.log(`Escalated critical ticket ${ticket.id}: ${ticket.subject}`);
        }
      }
    } catch (error) {
      console.error('Error escalating critical tickets:', error);
    }
  }

  /**
   * Get tickets requiring attention (for admin dashboard)
   */
  static async getTicketsRequiringAttention(): Promise<SupportTicket[]> {
    const filters = {
      status: 'open',
      limit: 50,
      sort: 'priority',
      order: 'desc' as const
    };

    const result = await SupportTicketModel.list(filters);
    return result.tickets;
  }
}