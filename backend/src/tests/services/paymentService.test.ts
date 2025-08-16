import { PaymentService } from '../../services/paymentService';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_test'
      })
    }
  }));
});

// Mock models
jest.mock('../../models/Transaction');
jest.mock('../../models/User');
jest.mock('../../models/Module');
jest.mock('../../models/BotModuleActivation');

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['STRIPE_SECRET_KEY'] = 'sk_test_123';
    process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_test_123';
  });

  it('should create PaymentService instance', () => {
    const paymentService = new PaymentService();
    expect(paymentService).toBeDefined();
  });
});