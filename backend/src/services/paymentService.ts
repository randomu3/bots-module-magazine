import Stripe from 'stripe';
import { TransactionModel } from '../models/Transaction';

import { BotModuleActivationModel } from '../models/BotModuleActivation';
import { ModuleModel } from '../models/Module';
import { ReferralService } from './referralService';
import { Transaction } from '../types/database';

export class PaymentService {
  private stripe: Stripe;

  constructor() {
    const stripeSecretKey = process.env['STRIPE_SECRET_KEY'];
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-07-30.basil',
    });
  }

  /**
   * Create a payment intent for module activation
   */
  async createModulePayment(
    userId: string,
    moduleId: string,
    botId: string,
    markupPercentage: number = 0
  ): Promise<{
    paymentIntent: Stripe.PaymentIntent;
    transaction: Transaction;
  }> {
    // Get module details
    const module = await ModuleModel.findById(moduleId);
    if (!module) {
      throw new Error('Module not found');
    }

    if (module.status !== 'approved') {
      throw new Error('Module is not available for purchase');
    }

    // Check if module is already activated for this bot
    const existingActivation = await BotModuleActivationModel.findByBotAndModule(botId, moduleId);
    if (existingActivation && existingActivation.status === 'active') {
      throw new Error('Module is already activated for this bot');
    }

    // Calculate final amount (module price + markup)
    const baseAmount = module.price;
    const markupAmount = (baseAmount * markupPercentage) / 100;
    const totalAmount = baseAmount + markupAmount;

    // Create transaction record
    const transaction = await TransactionModel.create({
      user_id: userId,
      type: 'payment',
      amount: totalAmount,
      currency: 'USD',
      description: `Payment for module: ${module.name}`,
      metadata: {
        module_id: moduleId,
        bot_id: botId,
        markup_percentage: markupPercentage,
        base_amount: baseAmount,
        markup_amount: markupAmount
      }
    });

    // Create Stripe payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        transaction_id: transaction.id,
        user_id: userId,
        module_id: moduleId,
        bot_id: botId
      },
      description: `Payment for module: ${module.name}`
    });

    // Update transaction with Stripe payment intent ID
    await TransactionModel.update(transaction.id, {
      metadata: {
        ...transaction.metadata,
        stripe_payment_intent_id: paymentIntent.id
      }
    });

    return { paymentIntent, transaction };
  }

  /**
   * Process successful payment and activate module
   */
  async processSuccessfulPayment(paymentIntentId: string): Promise<void> {
    // Find transaction by Stripe payment intent ID
    const transactions = await TransactionModel.list({
      limit: 1000
    });

    const transaction = transactions.transactions.find(t => 
      t.metadata?.['stripe_payment_intent_id'] === paymentIntentId
    );

    if (!transaction) {
      throw new Error('Transaction not found for payment intent');
    }

    if (transaction.status === 'completed') {
      return; // Already processed
    }

    // Update transaction status
    await TransactionModel.updateStatus(transaction.id, 'completed', new Date());

    // Activate module for bot
    const { module_id, bot_id, markup_percentage } = transaction.metadata;
    
    await BotModuleActivationModel.create({
      bot_id,
      module_id,
      markup_percentage: markup_percentage || 0,
      settings: {}
    });

    // Process referral commission if user was referred
    await ReferralService.processReferralCommission(
      transaction.user_id,
      transaction.amount,
      transaction.id
    );
  }

  /**
   * Handle failed payment
   */
  async processFailedPayment(paymentIntentId: string): Promise<void> {
    const transactions = await TransactionModel.list({
      limit: 1000
    });

    const transaction = transactions.transactions.find(t => 
      t.metadata?.['stripe_payment_intent_id'] === paymentIntentId
    );

    if (!transaction) {
      throw new Error('Transaction not found for payment intent');
    }

    await TransactionModel.updateStatus(transaction.id, 'failed', new Date());
  }

  /**
   * Create refund for a transaction
   */
  async createRefund(
    transactionId: string,
    amount?: number,
    reason?: string
  ): Promise<{
    refund: Stripe.Refund;
    refundTransaction: Transaction;
  }> {
    const transaction = await TransactionModel.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'completed') {
      throw new Error('Can only refund completed transactions');
    }

    const stripePaymentIntentId = transaction.metadata?.['stripe_payment_intent_id'];
    if (!stripePaymentIntentId) {
      throw new Error('Stripe payment intent ID not found');
    }

    const refundAmount = amount || transaction.amount;
    
    // Create Stripe refund
    const refund = await this.stripe.refunds.create({
      payment_intent: stripePaymentIntentId,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: reason === 'duplicate' ? 'duplicate' : 'requested_by_customer',
      metadata: {
        original_transaction_id: transactionId,
        refund_reason: reason || 'Customer request'
      }
    });

    // Create refund transaction
    const refundTransaction = await TransactionModel.createRefund(
      transaction.user_id,
      refundAmount,
      `Refund for transaction ${transactionId}`,
      {
        original_transaction_id: transactionId,
        stripe_refund_id: refund.id,
        refund_reason: reason
      }
    );

    // Deactivate module if full refund
    if (refundAmount >= transaction.amount) {
      const { module_id, bot_id } = transaction.metadata;
      if (module_id && bot_id) {
        const activation = await BotModuleActivationModel.findByBotAndModule(bot_id, module_id);
        if (activation) {
          await BotModuleActivationModel.deactivate(activation.id);
        }
      }
    }

    return { refund, refundTransaction };
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): Stripe.Event {
    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(filters: {
    start_date?: Date;
    end_date?: Date;
  } = {}): Promise<{
    total_revenue: number;
    total_transactions: number;
    successful_payments: number;
    failed_payments: number;
    refunds: number;
    average_transaction_value: number;
  }> {
    const stats = await TransactionModel.getRevenueStats({
      type: 'payment',
      ...filters
    });

    const refundStats = await TransactionModel.getRevenueStats({
      type: 'refund',
      ...filters
    });

    return {
      total_revenue: stats.total_revenue,
      total_transactions: stats.completed_transactions + stats.failed_transactions,
      successful_payments: stats.completed_transactions,
      failed_payments: stats.failed_transactions,
      refunds: refundStats.completed_transactions,
      average_transaction_value: stats.completed_transactions > 0 
        ? stats.total_revenue / stats.completed_transactions 
        : 0
    };
  }
}

export const paymentService = new PaymentService();