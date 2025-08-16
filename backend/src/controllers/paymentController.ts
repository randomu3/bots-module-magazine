import { Request, Response } from 'express';
import { paymentService } from '../services/paymentService';
import { TransactionModel } from '../models/Transaction';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class PaymentController {
  /**
   * Create payment intent for module activation
   */
  static async createPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { moduleId, botId, markupPercentage } = req.body;
      const userId = req.user!.id;

      if (!moduleId || !botId) {
        res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Module ID and Bot ID are required'
          }
        });
        return;
      }

      const result = await paymentService.createModulePayment(
        userId,
        moduleId,
        botId,
        markupPercentage
      );

      res.status(201).json({
        success: true,
        data: {
          client_secret: result.paymentIntent.client_secret,
          payment_intent_id: result.paymentIntent.id,
          transaction_id: result.transaction.id,
          amount: result.transaction.amount
        }
      });
    } catch (error: any) {
      console.error('Create payment error:', error);
      res.status(400).json({
        error: {
          code: 'PAYMENT_CREATION_FAILED',
          message: error.message || 'Failed to create payment'
        }
      });
    }
  }

  /**
   * Get payment history for authenticated user
   */
  static async getPaymentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const {
        page = 1,
        limit = 20,
        type,
        status,
        start_date,
        end_date
      } = req.query;

      const filters: any = {
        user_id: userId,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      if (type) filters.type = type;
      if (status) filters.status = status;
      if (start_date) filters.start_date = new Date(start_date as string);
      if (end_date) filters.end_date = new Date(end_date as string);

      const result = await TransactionModel.list(filters);

      res.json({
        success: true,
        data: {
          transactions: result.transactions,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: result.total,
            pages: Math.ceil(result.total / parseInt(limit as string))
          }
        }
      });
    } catch (error: any) {
      console.error('Get payment history error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_HISTORY_FAILED',
          message: 'Failed to fetch payment history'
        }
      });
    }
  }

  /**
   * Get user balance and transaction stats
   */
  static async getBalance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const [balance, stats] = await Promise.all([
        TransactionModel.getUserBalance(userId),
        TransactionModel.getUserTransactionStats(userId)
      ]);

      res.json({
        success: true,
        data: {
          balance,
          stats
        }
      });
    } catch (error: any) {
      console.error('Get balance error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_BALANCE_FAILED',
          message: 'Failed to fetch balance'
        }
      });
    }
  }

  /**
   * Handle Stripe webhooks
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body;

      if (!signature) {
        res.status(400).json({
          error: {
            code: 'MISSING_SIGNATURE',
            message: 'Stripe signature is required'
          }
        });
        return;
      }

      const event = paymentService.validateWebhookSignature(payload, signature);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await paymentService.processSuccessfulPayment(event.data.object.id);
          console.log('Payment succeeded:', event.data.object.id);
          break;

        case 'payment_intent.payment_failed':
          await paymentService.processFailedPayment(event.data.object.id);
          console.log('Payment failed:', event.data.object.id);
          break;

        case 'payment_intent.canceled':
          await paymentService.processFailedPayment(event.data.object.id);
          console.log('Payment canceled:', event.data.object.id);
          break;

        default:
          console.log('Unhandled webhook event type:', event.type);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(400).json({
        error: {
          code: 'WEBHOOK_ERROR',
          message: error.message || 'Webhook processing failed'
        }
      });
    }
  }

  /**
   * Create refund (admin only)
   */
  static async createRefund(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { transactionId, amount, reason } = req.body;
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

      if (!transactionId) {
        res.status(400).json({
          error: {
            code: 'MISSING_TRANSACTION_ID',
            message: 'Transaction ID is required'
          }
        });
        return;
      }

      const result = await paymentService.createRefund(transactionId, amount, reason);

      res.json({
        success: true,
        data: {
          refund_id: result.refund.id,
          transaction_id: result.refundTransaction.id,
          amount: result.refundTransaction.amount
        }
      });
    } catch (error: any) {
      console.error('Create refund error:', error);
      res.status(400).json({
        error: {
          code: 'REFUND_FAILED',
          message: error.message || 'Failed to create refund'
        }
      });
    }
  }

  /**
   * Get payment statistics (admin only)
   */
  static async getPaymentStats(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { start_date, end_date } = req.query;
      const filters: any = {};

      if (start_date) filters.start_date = new Date(start_date as string);
      if (end_date) filters.end_date = new Date(end_date as string);

      const stats = await paymentService.getPaymentStats(filters);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Get payment stats error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_STATS_FAILED',
          message: 'Failed to fetch payment statistics'
        }
      });
    }
  }

  /**
   * Get transaction details
   */
  static async getTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      if (!id) {
        res.status(400).json({
          error: {
            code: 'MISSING_TRANSACTION_ID',
            message: 'Transaction ID is required'
          }
        });
        return;
      }

      const transaction = await TransactionModel.findById(id);
      if (!transaction) {
        res.status(404).json({
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transaction not found'
          }
        });
        return;
      }

      // Users can only see their own transactions, admins can see all
      if (userRole !== 'admin' && transaction.user_id !== userId) {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only view your own transactions'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error: any) {
      console.error('Get transaction error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_TRANSACTION_FAILED',
          message: 'Failed to fetch transaction'
        }
      });
    }
  }
}