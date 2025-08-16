import { TransactionModel } from '../models/Transaction';
import { Transaction } from '../types/database';

export interface WithdrawalRequest {
  userId: string;
  amount: number;
  method: 'bank_transfer' | 'paypal' | 'crypto';
  details: {
    bankAccount?: {
      accountNumber: string;
      routingNumber: string;
      accountHolderName: string;
    };
    paypal?: {
      email: string;
    };
    crypto?: {
      address: string;
      currency: string;
    };
  };
}

export interface WithdrawalLimits {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  monthlyLimit: number;
  commission: number; // Percentage
}

export class WithdrawalService {
  private static readonly DEFAULT_LIMITS: WithdrawalLimits = {
    minAmount: 10,
    maxAmount: 10000,
    dailyLimit: 1000,
    monthlyLimit: 5000,
    commission: 2.5 // 2.5%
  };

  /**
   * Get withdrawal limits for a user
   */
  static async getWithdrawalLimits(_userId: string): Promise<WithdrawalLimits> {
    // In the future, this could be based on user verification level, history, etc.
    return this.DEFAULT_LIMITS;
  }

  /**
   * Check if user can withdraw the requested amount
   */
  static async canWithdraw(userId: string, amount: number): Promise<{
    canWithdraw: boolean;
    reason?: string;
    availableBalance?: number;
    limits?: WithdrawalLimits;
  }> {
    // Check user balance
    const balance = await TransactionModel.getUserBalance(userId);
    if (balance < amount) {
      return {
        canWithdraw: false,
        reason: 'Insufficient balance',
        availableBalance: balance
      };
    }

    // Get withdrawal limits
    const limits = await this.getWithdrawalLimits(userId);

    // Check minimum amount
    if (amount < limits.minAmount) {
      return {
        canWithdraw: false,
        reason: `Minimum withdrawal amount is $${limits.minAmount}`,
        limits
      };
    }

    // Check maximum amount
    if (amount > limits.maxAmount) {
      return {
        canWithdraw: false,
        reason: `Maximum withdrawal amount is $${limits.maxAmount}`,
        limits
      };
    }

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailyWithdrawals = await TransactionModel.list({
      user_id: userId,
      type: 'withdrawal',
      start_date: today,
      end_date: tomorrow,
      limit: 1000
    });

    const dailyTotal = dailyWithdrawals.transactions
      .filter(t => t.status === 'completed' || t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    if (dailyTotal + amount > limits.dailyLimit) {
      return {
        canWithdraw: false,
        reason: `Daily withdrawal limit of $${limits.dailyLimit} would be exceeded`,
        limits
      };
    }

    // Check monthly limit
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const monthlyWithdrawals = await TransactionModel.list({
      user_id: userId,
      type: 'withdrawal',
      start_date: monthStart,
      end_date: monthEnd,
      limit: 1000
    });

    const monthlyTotal = monthlyWithdrawals.transactions
      .filter(t => t.status === 'completed' || t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    if (monthlyTotal + amount > limits.monthlyLimit) {
      return {
        canWithdraw: false,
        reason: `Monthly withdrawal limit of $${limits.monthlyLimit} would be exceeded`,
        limits
      };
    }

    return {
      canWithdraw: true,
      availableBalance: balance,
      limits
    };
  }

  /**
   * Create a withdrawal request
   */
  static async createWithdrawalRequest(request: WithdrawalRequest): Promise<Transaction> {
    const { userId, amount, method, details } = request;

    // Validate withdrawal eligibility
    const eligibility = await this.canWithdraw(userId, amount);
    if (!eligibility.canWithdraw) {
      throw new Error(eligibility.reason || 'Withdrawal not allowed');
    }

    // Calculate commission
    const limits = eligibility.limits!;
    const commission = (amount * limits.commission) / 100;
    const netAmount = amount - commission;

    // Create withdrawal transaction
    const transaction = await TransactionModel.createWithdrawal(
      userId,
      amount,
      `Withdrawal request via ${method}`,
      {
        withdrawal_method: method,
        withdrawal_details: details,
        commission_amount: commission,
        net_amount: netAmount,
        status: 'pending_review'
      }
    );

    return transaction;
  }

  /**
   * Get withdrawal history for a user
   */
  static async getWithdrawalHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    withdrawals: Transaction[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const result = await TransactionModel.list({
      user_id: userId,
      type: 'withdrawal',
      page,
      limit,
      sort: 'created_at',
      order: 'desc'
    });

    return {
      withdrawals: result.transactions,
      total: result.total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(result.total / limit)
      }
    };
  }

  /**
   * Process withdrawal (admin function)
   */
  static async processWithdrawal(
    transactionId: string,
    action: 'approve' | 'reject',
    adminNote?: string
  ): Promise<Transaction> {
    const transaction = await TransactionModel.findById(transactionId);
    if (!transaction) {
      throw new Error('Withdrawal transaction not found');
    }

    if (transaction.type !== 'withdrawal') {
      throw new Error('Transaction is not a withdrawal');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Withdrawal has already been processed');
    }

    let newStatus: 'completed' | 'failed';
    let updatedMetadata = { ...transaction.metadata };

    if (action === 'approve') {
      newStatus = 'completed';
      updatedMetadata['admin_approved'] = true;
      updatedMetadata['processed_at'] = new Date().toISOString();
    } else {
      newStatus = 'failed';
      updatedMetadata['admin_rejected'] = true;
      updatedMetadata['rejection_reason'] = adminNote || 'Rejected by admin';
    }

    if (adminNote) {
      updatedMetadata['admin_note'] = adminNote;
    }

    const updatedTransaction = await TransactionModel.update(transactionId, {
      status: newStatus,
      processed_at: new Date(),
      metadata: updatedMetadata
    });

    return updatedTransaction!;
  }

  /**
   * Get pending withdrawals for admin review
   */
  static async getPendingWithdrawals(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    withdrawals: Transaction[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const result = await TransactionModel.list({
      type: 'withdrawal',
      status: 'pending',
      page,
      limit,
      sort: 'created_at',
      order: 'asc' // Oldest first for processing
    });

    return {
      withdrawals: result.transactions,
      total: result.total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(result.total / limit)
      }
    };
  }

  /**
   * Get withdrawal statistics
   */
  static async getWithdrawalStats(filters: {
    start_date?: Date;
    end_date?: Date;
    user_id?: string;
  } = {}): Promise<{
    total_withdrawals: number;
    total_amount: number;
    pending_withdrawals: number;
    pending_amount: number;
    completed_withdrawals: number;
    completed_amount: number;
    rejected_withdrawals: number;
    rejected_amount: number;
    total_commission: number;
  }> {
    const listFilters: any = {
      type: 'withdrawal',
      limit: 10000 // Get all for stats
    };
    
    if (filters.user_id) listFilters.user_id = filters.user_id;
    if (filters.start_date) listFilters.start_date = filters.start_date;
    if (filters.end_date) listFilters.end_date = filters.end_date;
    
    const allWithdrawals = await TransactionModel.list(listFilters);

    const withdrawals = allWithdrawals.transactions;

    const stats = {
      total_withdrawals: withdrawals.length,
      total_amount: 0,
      pending_withdrawals: 0,
      pending_amount: 0,
      completed_withdrawals: 0,
      completed_amount: 0,
      rejected_withdrawals: 0,
      rejected_amount: 0,
      total_commission: 0
    };

    withdrawals.forEach(withdrawal => {
      stats.total_amount += withdrawal.amount;
      
      const commission = withdrawal.metadata?.['commission_amount'] || 0;
      stats.total_commission += commission;

      switch (withdrawal.status) {
        case 'pending':
          stats.pending_withdrawals++;
          stats.pending_amount += withdrawal.amount;
          break;
        case 'completed':
          stats.completed_withdrawals++;
          stats.completed_amount += withdrawal.amount;
          break;
        case 'failed':
        case 'cancelled':
          stats.rejected_withdrawals++;
          stats.rejected_amount += withdrawal.amount;
          break;
      }
    });

    return stats;
  }

  /**
   * Cancel a pending withdrawal (user function)
   */
  static async cancelWithdrawal(userId: string, transactionId: string): Promise<Transaction> {
    const transaction = await TransactionModel.findById(transactionId);
    if (!transaction) {
      throw new Error('Withdrawal transaction not found');
    }

    if (transaction.user_id !== userId) {
      throw new Error('You can only cancel your own withdrawals');
    }

    if (transaction.type !== 'withdrawal') {
      throw new Error('Transaction is not a withdrawal');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Can only cancel pending withdrawals');
    }

    const updatedTransaction = await TransactionModel.update(transactionId, {
      status: 'cancelled',
      processed_at: new Date(),
      metadata: {
        ...transaction.metadata,
        cancelled_by_user: true,
        cancelled_at: new Date().toISOString()
      }
    });

    return updatedTransaction!;
  }
}