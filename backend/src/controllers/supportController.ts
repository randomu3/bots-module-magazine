import { Request, Response } from 'express';
import { SupportService } from '../services/supportService';
import { createSupportTicketSchema, updateSupportTicketSchema, paginationSchema } from '../validation/schemas';

export class SupportController {
  /**
   * Create a new support ticket
   */
  static async createTicket(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      const { error, value } = createSupportTicketSchema.validate({
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

      const ticket = await SupportService.createTicket(value);

      res.status(201).json({
        success: true,
        data: ticket,
        message: 'Support ticket created successfully'
      });
    } catch (error: any) {
      console.error('Error creating support ticket:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create support ticket'
        }
      });
    }
  }

  /**
   * Get ticket by ID (user can only access their own tickets)
   */
  static async getTicket(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const ticketId = req.params.id;

      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      const ticket = await SupportService.getTicketById(ticketId);

      if (!ticket) {
        res.status(404).json({
          error: {
            code: 'TICKET_NOT_FOUND',
            message: 'Support ticket not found'
          }
        });
        return;
      }

      // Users can only access their own tickets, admins can access all
      if (userRole !== 'admin' && ticket.user_id !== userId) {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only access your own support tickets'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: ticket
      });
    } catch (error: any) {
      console.error('Error getting support ticket:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get support ticket'
        }
      });
    }
  }

  /**
   * Get user's support tickets
   */
  static async getUserTickets(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      const tickets = await SupportService.getTicketsByUserId(userId);

      res.json({
        success: true,
        data: tickets
      });
    } catch (error: any) {
      console.error('Error getting user tickets:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get support tickets'
        }
      });
    }
  }

  /**
   * Update ticket status (admin only)
   */
  static async updateTicketStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const ticketId = req.params.id;
      const { status } = req.body;

      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      if (userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only administrators can update ticket status'
          }
        });
        return;
      }

      if (!status) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Status is required'
          }
        });
        return;
      }

      const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
          }
        });
        return;
      }

      const ticket = await SupportService.updateTicketStatus(ticketId, status, userId);

      if (!ticket) {
        res.status(404).json({
          error: {
            code: 'TICKET_NOT_FOUND',
            message: 'Support ticket not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: ticket,
        message: 'Ticket status updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update ticket status'
        }
      });
    }
  }

  /**
   * Update ticket details (admin only)
   */
  static async updateTicket(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const ticketId = req.params.id;

      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      if (userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only administrators can update tickets'
          }
        });
        return;
      }

      const { error, value } = updateSupportTicketSchema.validate(req.body);

      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid input'
          }
        });
        return;
      }

      const ticket = await SupportService.updateTicket(ticketId, value);

      if (!ticket) {
        res.status(404).json({
          error: {
            code: 'TICKET_NOT_FOUND',
            message: 'Support ticket not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: ticket,
        message: 'Ticket updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update ticket'
        }
      });
    }
  }

  /**
   * Delete ticket (admin only)
   */
  static async deleteTicket(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const ticketId = req.params.id;

      if (!userId) {
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
        return;
      }

      if (userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only administrators can delete tickets'
          }
        });
        return;
      }

      const deleted = await SupportService.deleteTicket(ticketId);

      if (!deleted) {
        res.status(404).json({
          error: {
            code: 'TICKET_NOT_FOUND',
            message: 'Support ticket not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        message: 'Ticket deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete ticket'
        }
      });
    }
  }

  /**
   * List all tickets with filters (admin only)
   */
  static async listTickets(req: Request, res: Response): Promise<void> {
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
            message: 'Only administrators can list all tickets'
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
        status: req.query.status as string,
        priority: req.query.priority as string
      };

      const result = await SupportService.listTickets(filters);

      res.json({
        success: true,
        data: result.tickets,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          pages: Math.ceil(result.total / filters.limit)
        }
      });
    } catch (error: any) {
      console.error('Error listing tickets:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list tickets'
        }
      });
    }
  }

  /**
   * Get ticket statistics (admin only)
   */
  static async getTicketStats(req: Request, res: Response): Promise<void> {
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
            message: 'Only administrators can view ticket statistics'
          }
        });
        return;
      }

      const stats = await SupportService.getTicketStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting ticket stats:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get ticket statistics'
        }
      });
    }
  }

  /**
   * Get tickets requiring attention (admin only)
   */
  static async getTicketsRequiringAttention(req: Request, res: Response): Promise<void> {
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
            message: 'Only administrators can view tickets requiring attention'
          }
        });
        return;
      }

      const tickets = await SupportService.getTicketsRequiringAttention();

      res.json({
        success: true,
        data: tickets
      });
    } catch (error: any) {
      console.error('Error getting tickets requiring attention:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get tickets requiring attention'
        }
      });
    }
  }
}