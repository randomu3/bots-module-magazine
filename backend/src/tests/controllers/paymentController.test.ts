import request from 'supertest';
import app from '../../index';
import { paymentService } from '../../services/paymentService';
import { TransactionModel } from '../../models/Transaction';
import jwt from 'jsonwebtoken';

// Mock the payment service
jest.mock('../../services/paymentService');
jest.mock('../../models/Transaction');

describe('PaymentController', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'user'
  };

  const mockAdmin = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'admin'
  };

  const mockTransaction = {
    id: 'transaction-1',
    user_id: 'user-1',
    type: 'payment',
    amount: 20,
    status: 'completed',
    created_at: new Date(),
    metadata: {}
  };

  let userToken: string;
  let adminToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create JWT tokens for testing
    userToken = jwt.sign(mockUser, process.env['JWT_SECRET'] || 'test-secret');
    adminToken = jwt.sign(mockAdmin, process.env['JWT_SECRET'] || 'test-secret');
  });

  describe('POST /api/payments/create', () => {
    it('should create payment intent', async () => {
      const mockPaymentResult = {
        paymentIntent: {
          id: 'pi_test_123',
          client_secret: 'pi_test_123_secret'
        },
        transaction: mockTransaction
      };

      (paymentService.createModulePayment as jest.Mock).mockResolvedValue(mockPaymentResult);

      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          moduleId: 'module-1',
          botId: 'bot-1',
          markupPercentage: 10
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.client_secret).toBe('pi_test_123_secret');
      expect(response.body.data.payment_intent_id).toBe('pi_test_123');
      expect(paymentService.createModulePayment).toHaveBeenCalledWith(
        'user-1',
        'module-1',
        'bot-1',
        10
      );
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          moduleId: 'module-1'
          // Missing botId
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/payments/create')
        .send({
          moduleId: 'module-1',
          botId: 'bot-1'
        });

      expect(response.status).toBe(401);
    });

    it('should handle payment creation errors', async () => {
      (paymentService.createModulePayment as jest.Mock).mockRejectedValue(
        new Error('Module not found')
      );

      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          moduleId: 'module-1',
          botId: 'bot-1'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('PAYMENT_CREATION_FAILED');
      expect(response.body.error.message).toBe('Module not found');
    });
  });

  describe('GET /api/payments/history', () => {
    it('should return payment history for user', async () => {
      const mockResult = {
        transactions: [mockTransaction],
        total: 1
      };

      (TransactionModel.list as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/payments/history')
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          page: 1,
          limit: 20,
          type: 'payment'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.pagination.total).toBe(1);
      expect(TransactionModel.list).toHaveBeenCalledWith({
        user_id: 'user-1',
        page: 1,
        limit: 20,
        type: 'payment'
      });
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/payments/history');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/payments/balance', () => {
    it('should return user balance and stats', async () => {
      const mockBalance = 100.50;
      const mockStats = {
        total_earned: 200,
        total_spent: 99.50,
        total_withdrawn: 0,
        pending_amount: 0
      };

      (TransactionModel.getUserBalance as jest.Mock).mockResolvedValue(mockBalance);
      (TransactionModel.getUserTransactionStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/payments/balance')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBe(100.50);
      expect(response.body.data.stats).toEqual(mockStats);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/payments/balance');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('should process successful payment webhook', async () => {
      (paymentService.validateWebhookSignature as jest.Mock).mockReturnValue({
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123'
          }
        }
      });
      (paymentService.processSuccessfulPayment as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'test-signature')
        .send('webhook-payload');

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
      expect(paymentService.processSuccessfulPayment).toHaveBeenCalledWith('pi_test_123');
    });

    it('should process failed payment webhook', async () => {
      (paymentService.validateWebhookSignature as jest.Mock).mockReturnValue({
        id: 'evt_test_123',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123'
          }
        }
      });
      (paymentService.processFailedPayment as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'test-signature')
        .send('webhook-payload');

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
      expect(paymentService.processFailedPayment).toHaveBeenCalledWith('pi_test_123');
    });

    it('should return 400 for missing signature', async () => {
      const response = await request(app)
        .post('/api/payments/webhook')
        .send('webhook-payload');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_SIGNATURE');
    });

    it('should handle webhook validation errors', async () => {
      (paymentService.validateWebhookSignature as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid webhook signature');
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'invalid-signature')
        .send('webhook-payload');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('WEBHOOK_ERROR');
    });
  });

  describe('POST /api/payments/refund', () => {
    it('should create refund for admin user', async () => {
      const mockRefundResult = {
        refund: { id: 'ref_test_123' },
        refundTransaction: { id: 'refund-transaction-1', amount: 20 }
      };

      (paymentService.createRefund as jest.Mock).mockResolvedValue(mockRefundResult);

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          transactionId: 'transaction-1',
          amount: 20,
          reason: 'Customer request'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.refund_id).toBe('ref_test_123');
      expect(paymentService.createRefund).toHaveBeenCalledWith(
        'transaction-1',
        20,
        'Customer request'
      );
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          transactionId: 'transaction-1'
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return 400 for missing transaction ID', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 20
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_TRANSACTION_ID');
    });
  });

  describe('GET /api/payments/stats', () => {
    it('should return payment stats for admin user', async () => {
      const mockStats = {
        total_revenue: 1000,
        total_transactions: 55,
        successful_payments: 50,
        failed_payments: 5,
        refunds: 3,
        average_transaction_value: 20
      };

      (paymentService.getPaymentStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/payments/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/payments/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('GET /api/payments/transactions/:id', () => {
    it('should return transaction details for owner', async () => {
      (TransactionModel.findById as jest.Mock).mockResolvedValue(mockTransaction);

      const response = await request(app)
        .get('/api/payments/transactions/transaction-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTransaction);
    });

    it('should return transaction details for admin', async () => {
      const otherUserTransaction = {
        ...mockTransaction,
        user_id: 'other-user'
      };

      (TransactionModel.findById as jest.Mock).mockResolvedValue(otherUserTransaction);

      const response = await request(app)
        .get('/api/payments/transactions/transaction-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(otherUserTransaction);
    });

    it('should return 403 for non-owner non-admin', async () => {
      const otherUserTransaction = {
        ...mockTransaction,
        user_id: 'other-user'
      };

      (TransactionModel.findById as jest.Mock).mockResolvedValue(otherUserTransaction);

      const response = await request(app)
        .get('/api/payments/transactions/transaction-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should return 404 for non-existent transaction', async () => {
      (TransactionModel.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/payments/transactions/transaction-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TRANSACTION_NOT_FOUND');
    });
  });
});