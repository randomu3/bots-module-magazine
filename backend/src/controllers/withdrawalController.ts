import { Response } from 'express';
import { WithdrawalService, WithdrawalRequest } from '../services/withdrawalService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class WithdrawalController {
  /**
   * Get withdrawal limits for authenticated user
   */
  static async getWithdrawalLimits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const limits = await WithdrawalService.getWithdrawalLimits(userId);

      res.json({
        success: true,
        data: limits
      });
    } catch (error: any) {
      console.error('Get withdrawal limits error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_LIMITS_FAILED',
          message: 'Failed to fetch withdrawal limits'
        }
      });
    }
  }

  /**
   * Check if user can withdraw a specific amount
   */
  static async checkWithdrawalEligibility(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Valid amount is required'
          }
        });
        return;
      }

      const eligibility = await WithdrawalService.canWithdraw(userId, amount);

      res.json({
        success: true,
        data: eligibility
      });
    } catch (error: any) {
      console.error('Check withdrawal eligibility error:', error);
      res.status(500).json({
        error: {
          code: 'ELIGIBILITY_CHECK_FAILED',
          message: 'Failed to check withdrawal eligibility'
        }
      });
    }
  }

  /**
   * Create a withdrawal request
   */
  static async createWithdrawalRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { amount, method, details } = req.body;

      // Validate required fields
      if (!amount || !method || !details) {
        res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Amount, method, and details are required'
          }
        });
        return;
      }

      // Validate withdrawal method
      const validMethods = ['bank_transfer', 'paypal', 'crypto'];
      if (!validMethods.includes(method)) {
        res.status(400).json({
          error: {
            code: 'INVALID_METHOD',
            message: 'Invalid withdrawal method'
          }
        });
        return;
      }

      // Validate method-specific details
      if (method === 'bank_transfer' && (!details.bankAccount || !details.bankAccount.accountNumber)) {
        res.status(400).json({
          error: {
            code: 'INVALID_BANK_DETAILS',
            message: 'Bank account details are required for bank transfer'
          }
        });
        return;
      }

      if (method === 'paypal' && (!details.paypal || !details.paypal.email)) {
        res.status(400).json({
          error: {
            code: 'INVALID_PAYPAL_DETAILS',
            message: 'PayPal email is required for PayPal withdrawal'
          }
        });
        return;
      }

      if (method === 'crypto' && (!details.crypto || !details.crypto.address)) {
        res.status(400).json({
          error: {
            code: 'INVALID_CRYPTO_DETAILS',
            message: 'Crypto address is required for crypto withdrawal'
          }
        });
        return;
      }

      const withdrawalRequest: WithdrawalRequest = {
        userId,
        amount,
        method,
        details
      };

      const transaction = await WithdrawalService.createWithdrawalRequest(withdrawalRequest);

      res.status(201).json({
        success: true,
        data: {
          transaction_id: transaction.id,
          amount: transaction.amount,
          status: transaction.status,
          created_at: transaction.created_at
        }
      });
    } catch (error: any) {
      console.error('Create withdrawal request error:', error);
      res.status(400).json({
        error: {
          code: 'WITHDRAWAL_REQUEST_FAILED',
          message: error.message || 'Failed to create withdrawal request'
        }
      });
    }
  }

  /**
   * Get withdrawal history for authenticated user
   */
  static async getWithdrawalHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 20 } = req.query;

      const result = await WithdrawalService.getWithdrawalHistory(
        userId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Get withdrawal history error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_HISTORY_FAILED',
          message: 'Failed to fetch withdrawal history'
        }
      });
    }
  }

  /**
   * Cancel a pending withdrawal
   */
  static async cancelWithdrawal(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: {
            code: 'MISSING_TRANSACTION_ID',
            message: 'Transaction ID is required'
          }
        });
        return;
      }

      const transaction = await WithdrawalService.cancelWithdrawal(userId, id);

      res.json({
        success: true,
        data: {
          transaction_id: transaction.id,
          status: transaction.status,
          cancelled_at: transaction.processed_at
        }
      });
    } catch (error: any) {
      console.error('Cancel withdrawal error:', error);
      res.status(400).json({
        error: {
          code: 'CANCEL_WITHDRAWAL_FAILED',
          message: error.message || 'Failed to cancel withdrawal'
        }
      });
    }
  }

  /**
   * Get pending withdrawals for admin review
   */
  static async getPendingWithdrawals(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;

      // Check if user is admin
      if (user.role !== 'admin') {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required'
          }
        });
        return;
      }

      const { page = 1, limit = 20 } = req.query;

      const result = await WithdrawalService.getPendingWithdrawals(
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Get pending withdrawals error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_PENDING_FAILED',
          message: 'Failed to fetch pending withdrawals'
        }
      });
    }
  }

  /**
   * Process withdrawal (approve or reject)
   */
  static async processWithdrawal(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;

      // Check if user is admin
      if (user.role !== 'admin') {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required'
          }
        });
        return;
      }

      const { id } = req.params;
      const { action, adminNote } = req.body;

      if (!id) {
        res.status(400).json({
          error: {
            code: 'MISSING_TRANSACTION_ID',
            message: 'Transaction ID is required'
          }
        });
        return;
      }

      if (!action || !['approve', 'reject'].includes(action)) {
        res.status(400).json({
          error: {
            code: 'INVALID_ACTION',
            message: 'Action must be either "approve" or "reject"'
          }
        });
        return;
      }

      const transaction = await WithdrawalService.processWithdrawal(id, action, adminNote);

      res.json({
        success: true,
        data: {
          transaction_id: transaction.id,
          status: transaction.status,
          processed_at: transaction.processed_at,
          admin_note: transaction.metadata?.['admin_note']
        }
      });
    } catch (error: any) {
      console.error('Process withdrawal error:', error);
      res.status(400).json({
        error: {
          code: 'PROCESS_WITHDRAWAL_FAILED',
          message: error.message || 'Failed to process withdrawal'
        }
      });
    }
  }

  /**
   * Get withdrawal statistics
   */
  static async getWithdrawalStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { start_date, end_date, user_id } = req.query;

      // Non-admin users can only see their own stats
      let targetUserId: string | undefined;
      if (user.role === 'admin') {
        targetUserId = user_id as string;
      } else {
        targetUserId = user.id;
      }

      const filters: any = {};
      if (targetUserId) filters.user_id = targetUserId;
      if (start_date) filters.start_date = new Date(start_date as string);
      if (end_date) filters.end_date = new Date(end_date as string);

      const stats = await WithdrawalService.getWithdrawalStats(filters);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Get withdrawal stats error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_STATS_FAILED',
          message: 'Failed to fetch withdrawal statistics'
        }
      });
    }
  }
}