import { Request, Response } from 'express';
import { AdminService } from '../services/adminService';

export class AdminController {
  // Dashboard Stats
  static async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await AdminService.getDashboardStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard stats'
      });
    }
  }

  // Users Management
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const result = await AdminService.getUsers({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        role: role as string,
        status: status as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get users'
      });
    }
  }

  static async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      await AdminService.updateUserStatus(userId, status);

      res.json({
        success: true,
        message: 'User status updated successfully'
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user status'
      });
    }
  }

  static async updateUserBalance(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { amount, operation } = req.body;

      await AdminService.updateUserBalance(userId, amount, operation);

      res.json({
        success: true,
        message: 'User balance updated successfully'
      });
    } catch (error) {
      console.error('Error updating user balance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user balance'
      });
    }
  }

  // Bots Management
  static async getBots(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        userId
      } = req.query;

      const result = await AdminService.getBots({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        status: status as string,
        userId: userId as string
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting bots:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get bots'
      });
    }
  }

  static async updateBotStatus(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;
      const { status } = req.body;

      await AdminService.updateBotStatus(botId, status);

      res.json({
        success: true,
        message: 'Bot status updated successfully'
      });
    } catch (error) {
      console.error('Error updating bot status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update bot status'
      });
    }
  }

  // Modules Management
  static async getModules(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        category
      } = req.query;

      const result = await AdminService.getModules({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        status: status as string,
        category: category as string
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting modules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get modules'
      });
    }
  }

  static async updateModuleStatus(req: Request, res: Response): Promise<void> {
    try {
      const { moduleId } = req.params;
      const { status, notes } = req.body;

      await AdminService.updateModuleStatus(moduleId, status, notes);

      res.json({
        success: true,
        message: 'Module status updated successfully'
      });
    } catch (error) {
      console.error('Error updating module status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update module status'
      });
    }
  }

  // Withdrawals Management
  static async getWithdrawals(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        userId
      } = req.query;

      const result = await AdminService.getWithdrawals({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        userId: userId as string
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting withdrawals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get withdrawals'
      });
    }
  }

  static async processWithdrawal(req: Request, res: Response): Promise<void> {
    try {
      const { withdrawalId } = req.params;
      const { action, notes } = req.body;

      await AdminService.processWithdrawal(withdrawalId, action, notes);

      res.json({
        success: true,
        message: 'Withdrawal processed successfully'
      });
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process withdrawal'
      });
    }
  }

  // Support Tickets Management
  static async getTickets(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        category,
        assignedTo
      } = req.query;

      const result = await AdminService.getTickets({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        priority: priority as string,
        category: category as string,
        assignedTo: assignedTo as string
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting tickets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tickets'
      });
    }
  }

  static async updateTicketStatus(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { status } = req.body;

      await AdminService.updateTicketStatus(ticketId, status);

      res.json({
        success: true,
        message: 'Ticket status updated successfully'
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update ticket status'
      });
    }
  }

  static async assignTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { assignedTo } = req.body;

      await AdminService.assignTicket(ticketId, assignedTo);

      res.json({
        success: true,
        message: 'Ticket assigned successfully'
      });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign ticket'
      });
    }
  }
}