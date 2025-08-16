import '../integration-setup';
import request from 'supertest';
import app from '../../index';
import { UserModel } from '../../models/User';
import { EmailVerificationTokenModel } from '../../models/EmailVerificationToken';
import { PaymentService } from '../../services/paymentService';

// Mock external payment services
jest.mock('../../services/paymentService');
const mockPaymentService = PaymentService as jest.Mocked<typeof PaymentService>;

// Mock email service
jest.mock('../../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPaymentConfirmationEmail: jest.fn().mockResolvedValue(undefined),
  sendWithdrawalNotificationEmail: jest.fn().mockResolvedValue(undefined),
  verifyEmailConfig: jest.fn().mockResolvedValue(true)
}));

describe('Payment Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let testUser: any;

  beforeAll(async () => {
    // Create and verify test user
    const userData = {
      email: `paymenttest-${Date.now()}@example.com`,
      password: 'testpassword123',
      first_name: 'Payment',
      last_name: 'Tester'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    userId = registerResponse.body.user.id;
    testUser = registerResponse.body.user;

    // Verify email
    const verificationTokens = await EmailVerificationTokenModel.findByUserId(userId);
    await request(app)
      .post('/api/auth/verify-email')
      .send({ token: verificationTokens[0]?.token });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    authToken = loginResponse.body.tokens.accessToken;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/payments/create', () => {
    it('should create payment for module activation', async () => {
      const mockPaymentResponse = {
        payment_id: 'pay_123456789',
        payment_url: 'https://payment-gateway.com/pay/123456789',
        amount: 29.99,
        currency: 'USD',
        status: 'pending'
      };

      mockPaymentService.createPayment.mockResolvedValueOnce(mockPaymentResponse);

      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          module_id: 'module-123',
          bot_id: 'bot-456',
          amount: 29.99,
          currency: 'USD',
          payment_method: 'stripe'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        message: 'Payment created successfully',
        payment: {
          id: expect.any(String),
          amount: 29.99,
          currency: 'USD',
          status: 'pending',
          payment_url: mockPaymentResponse.payment_url
        }
      });

      expect(mockPaymentService.createPayment).toHaveBeenCalledWith({
        user_id: userId,
        module_id: 'module-123',
        bot_id: 'bot-456',
        amount: 29.99,
        currency: 'USD',
        payment_method: 'stripe'
      });
    });

    it('should validate payment creation data', async () => {
      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          module_id: 'module-123',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject payment with invalid amount', async () => {
      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          module_id: 'module-123',
          bot_id: 'bot-456',
          amount: -10, // Negative amount
          currency: 'USD'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_AMOUNT');
    });

    it('should handle payment service errors', async () => {
      mockPaymentService.createPayment.mockRejectedValueOnce(
        new Error('Payment gateway unavailable')
      );

      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          module_id: 'module-123',
          bot_id: 'bot-456',
          amount: 29.99,
          currency: 'USD',
          payment_method: 'stripe'
        });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('PAYMENT_SERVICE_ERROR');
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('should process successful payment webhook', async () => {
      const webhookData = {
        event_type: 'payment.completed',
        payment_id: 'pay_123456789',
        transaction_id: 'txn_987654321',
        amount: 29.99,
        currency: 'USD',
        user_id: userId,
        module_id: 'module-123',
        bot_id: 'bot-456'
      };

      mockPaymentService.verifyWebhookSignature.mockReturnValueOnce(true);
      mockPaymentService.processPaymentWebhook.mockResolvedValueOnce({
        success: true,
        transaction_id: 'txn_987654321'
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('X-Webhook-Signature', 'valid-signature')
        .send(webhookData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Webhook processed successfully');

      expect(mockPaymentService.verifyWebhookSignature).toHaveBeenCalled();
      expect(mockPaymentService.processPaymentWebhook).toHaveBeenCalledWith(webhookData);
    });

    it('should reject webhook with invalid signature', async () => {
      mockPaymentService.verifyWebhookSignature.mockReturnValueOnce(false);

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('X-Webhook-Signature', 'invalid-signature')
        .send({
          event_type: 'payment.completed',
          payment_id: 'pay_123456789'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
    });

    it('should handle failed payment webhook', async () => {
      const webhookData = {
        event_type: 'payment.failed',
        payment_id: 'pay_123456789',
        error_code: 'insufficient_funds',
        error_message: 'Insufficient funds'
      };

      mockPaymentService.verifyWebhookSignature.mockReturnValueOnce(true);
      mockPaymentService.processPaymentWebhook.mockResolvedValueOnce({
        success: false,
        error: 'Payment failed'
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('X-Webhook-Signature', 'valid-signature')
        .send(webhookData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Webhook processed successfully');
    });
  });

  describe('GET /api/payments/history', () => {
    it('should get payment history', async () => {
      const response = await request(app)
        .get('/api/payments/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('payments');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.payments)).toBe(true);
    });

    it('should filter payments by status', async () => {
      const response = await request(app)
        .get('/api/payments/history?status=completed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.payments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'completed'
          })
        ])
      );
    });

    it('should filter payments by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const response = await request(app)
        .get(`/api/payments/history?start_date=${startDate}&end_date=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.payments)).toBe(true);
    });
  });

  describe('GET /api/payments/:id', () => {
    it('should get payment details', async () => {
      // First create a payment
      const mockPaymentResponse = {
        payment_id: 'pay_details_test',
        payment_url: 'https://payment-gateway.com/pay/details_test',
        amount: 19.99,
        currency: 'USD',
        status: 'pending'
      };

      mockPaymentService.createPayment.mockResolvedValueOnce(mockPaymentResponse);

      const createResponse = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          module_id: 'module-details',
          bot_id: 'bot-details',
          amount: 19.99,
          currency: 'USD',
          payment_method: 'stripe'
        });

      const paymentId = createResponse.body.payment.id;

      // Get payment details
      const response = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.payment).toMatchObject({
        id: paymentId,
        amount: 19.99,
        currency: 'USD',
        user_id: userId
      });
    });

    it('should return 404 for non-existent payment', async () => {
      const response = await request(app)
        .get('/api/payments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PAYMENT_NOT_FOUND');
    });
  });

  describe('POST /api/payments/:id/refund', () => {
    it('should process refund request', async () => {
      // Create a completed payment first
      const mockPaymentResponse = {
        payment_id: 'pay_refund_test',
        payment_url: 'https://payment-gateway.com/pay/refund_test',
        amount: 39.99,
        currency: 'USD',
        status: 'completed'
      };

      mockPaymentService.createPayment.mockResolvedValueOnce(mockPaymentResponse);

      const createResponse = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          module_id: 'module-refund',
          bot_id: 'bot-refund',
          amount: 39.99,
          currency: 'USD',
          payment_method: 'stripe'
        });

      const paymentId = createResponse.body.payment.id;

      // Mock refund service
      mockPaymentService.processRefund.mockResolvedValueOnce({
        refund_id: 'ref_123456789',
        amount: 39.99,
        status: 'pending'
      });

      const response = await request(app)
        .post(`/api/payments/${paymentId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Customer request',
          amount: 39.99
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Refund processed successfully',
        refund: {
          refund_id: 'ref_123456789',
          amount: 39.99,
          status: 'pending'
        }
      });
    });

    it('should reject refund for non-refundable payment', async () => {
      const response = await request(app)
        .post('/api/payments/non-refundable-payment/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Customer request',
          amount: 39.99
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('PAYMENT_NOT_REFUNDABLE');
    });
  });

  describe('Balance Management', () => {
    it('should add funds to user balance', async () => {
      const response = await request(app)
        .post('/api/payments/add-funds')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100.00,
          currency: 'USD',
          payment_method: 'stripe'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        message: 'Funds added successfully',
        transaction: {
          type: 'deposit',
          amount: 100.00,
          currency: 'USD',
          status: 'pending'
        }
      });
    });

    it('should get balance history', async () => {
      const response = await request(app)
        .get('/api/payments/balance-history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('current_balance');
      expect(Array.isArray(response.body.transactions)).toBe(true);
    });
  });

  describe('Subscription Payments', () => {
    it('should create subscription for recurring module', async () => {
      const mockSubscriptionResponse = {
        subscription_id: 'sub_123456789',
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      mockPaymentService.createSubscription.mockResolvedValueOnce(mockSubscriptionResponse);

      const response = await request(app)
        .post('/api/payments/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          module_id: 'module-subscription',
          bot_id: 'bot-subscription',
          plan: 'monthly',
          payment_method: 'stripe'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        message: 'Subscription created successfully',
        subscription: {
          subscription_id: 'sub_123456789',
          status: 'active'
        }
      });
    });

    it('should cancel subscription', async () => {
      mockPaymentService.cancelSubscription.mockResolvedValueOnce({
        subscription_id: 'sub_123456789',
        status: 'cancelled',
        cancelled_at: new Date()
      });

      const response = await request(app)
        .delete('/api/payments/subscriptions/sub_123456789')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Subscription cancelled successfully',
        subscription: {
          subscription_id: 'sub_123456789',
          status: 'cancelled'
        }
      });
    });

    it('should get subscription details', async () => {
      const response = await request(app)
        .get('/api/payments/subscriptions/sub_123456789')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.subscription).toMatchObject({
        subscription_id: 'sub_123456789',
        user_id: userId
      });
    });
  });

  describe('Payment Methods', () => {
    it('should add payment method', async () => {
      const mockPaymentMethod = {
        payment_method_id: 'pm_123456789',
        type: 'card',
        last4: '4242',
        brand: 'visa'
      };

      mockPaymentService.addPaymentMethod.mockResolvedValueOnce(mockPaymentMethod);

      const response = await request(app)
        .post('/api/payments/payment-methods')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'card',
          token: 'tok_visa_4242'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        message: 'Payment method added successfully',
        payment_method: mockPaymentMethod
      });
    });

    it('should get user payment methods', async () => {
      const response = await request(app)
        .get('/api/payments/payment-methods')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('payment_methods');
      expect(Array.isArray(response.body.payment_methods)).toBe(true);
    });

    it('should delete payment method', async () => {
      mockPaymentService.deletePaymentMethod.mockResolvedValueOnce(true);

      const response = await request(app)
        .delete('/api/payments/payment-methods/pm_123456789')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Payment method deleted successfully');
    });
  });

  describe('Payment Analytics', () => {
    it('should get payment statistics', async () => {
      const response = await request(app)
        .get('/api/payments/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_spent');
      expect(response.body).toHaveProperty('total_earned');
      expect(response.body).toHaveProperty('monthly_stats');
      expect(response.body).toHaveProperty('payment_methods_used');
    });

    it('should get revenue breakdown by module', async () => {
      const response = await request(app)
        .get('/api/payments/revenue-breakdown')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('by_module');
      expect(response.body).toHaveProperty('by_bot');
      expect(response.body).toHaveProperty('total_revenue');
    });
  });
});