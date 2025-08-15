import request from 'supertest';
import app from '../../index';
import { UserModel } from '../../models/User';
import { TransactionModel } from '../../models/Transaction';
// JWT is mocked in setup.ts

// Mock the models
jest.mock('../../models/User');
jest.mock('../../models/Transaction');
const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockTransactionModel = TransactionModel as jest.Mocked<typeof TransactionModel>;

describe('User Balance Controller', () => {
  let authToken: string;
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    first_name: 'John',
    last_name: 'Doe',
    role: 'user' as const,
    balance: 100.50,
    referral_code: 'REF123',
    email_verified: true,
    theme_preference: 'light' as const,
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    // Generate auth token
    authToken = 'mocked-jwt-token';

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('GET /api/users/balance', () => {
    it('should return user balance successfully', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/users/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          balance: mockUser.balance,
          currency: 'USD'
        }
      });

      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/users/balance')
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return 404 if user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /api/users/balance/add', () => {
    const addFundsData = {
      amount: 50.00,
      description: 'Test top-up'
    };

    it('should add funds successfully', async () => {
      const updatedUser = { ...mockUser, balance: mockUser.balance + addFundsData.amount };
      const mockTransaction = {
        id: 'trans-123',
        user_id: mockUser.id,
        type: 'payment' as const,
        amount: addFundsData.amount,
        currency: 'USD',
        status: 'pending' as const,
        description: addFundsData.description,
        metadata: { source: 'manual_add_funds' },
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserModel.updateBalance.mockResolvedValue(updatedUser);
      mockTransactionModel.create.mockResolvedValue(mockTransaction);

      const response = await request(app)
        .post('/api/users/balance/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(addFundsData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          balance: updatedUser.balance,
          amount_added: addFundsData.amount
        },
        message: 'Funds added successfully'
      });

      expect(mockUserModel.updateBalance).toHaveBeenCalledWith(mockUser.id, addFundsData.amount);
      expect(mockTransactionModel.create).toHaveBeenCalledWith({
        user_id: mockUser.id,
        type: 'payment',
        amount: addFundsData.amount,
        currency: 'USD',
        description: addFundsData.description,
        metadata: { source: 'manual_add_funds' }
      });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/users/balance/add')
        .send(addFundsData)
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return 400 for invalid amount', async () => {
      const invalidData = { amount: -10 };

      const response = await request(app)
        .post('/api/users/balance/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_AMOUNT');
    });

    it('should return 404 if user not found', async () => {
      mockUserModel.updateBalance.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/users/balance/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(addFundsData)
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /api/users/balance/deduct', () => {
    const deductFundsData = {
      amount: 25.00,
      description: 'Test deduction'
    };

    it('should deduct funds successfully', async () => {
      const updatedUser = { ...mockUser, balance: mockUser.balance - deductFundsData.amount };
      const mockTransaction = {
        id: 'trans-456',
        user_id: mockUser.id,
        type: 'withdrawal' as const,
        amount: deductFundsData.amount,
        currency: 'USD',
        status: 'pending' as const,
        description: deductFundsData.description,
        metadata: { source: 'manual_deduct_funds' },
        created_at: new Date(),
        updated_at: new Date()
      };

      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.updateBalance.mockResolvedValue(updatedUser);
      mockTransactionModel.create.mockResolvedValue(mockTransaction);

      const response = await request(app)
        .post('/api/users/balance/deduct')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deductFundsData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          balance: updatedUser.balance,
          amount_deducted: deductFundsData.amount
        },
        message: 'Funds deducted successfully'
      });

      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUser.id);
      expect(mockUserModel.updateBalance).toHaveBeenCalledWith(mockUser.id, -deductFundsData.amount);
      expect(mockTransactionModel.create).toHaveBeenCalledWith({
        user_id: mockUser.id,
        type: 'withdrawal',
        amount: deductFundsData.amount,
        currency: 'USD',
        description: deductFundsData.description,
        metadata: { source: 'manual_deduct_funds' }
      });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/users/balance/deduct')
        .send(deductFundsData)
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return 400 for insufficient balance', async () => {
      const lowBalanceUser = { ...mockUser, balance: 10.00 };
      mockUserModel.findById.mockResolvedValue(lowBalanceUser);

      const response = await request(app)
        .post('/api/users/balance/deduct')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deductFundsData)
        .expect(400);

      expect(response.body.error.code).toBe('INSUFFICIENT_BALANCE');
    });

    it('should return 400 for invalid amount', async () => {
      const invalidData = { amount: 0 };

      const response = await request(app)
        .post('/api/users/balance/deduct')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_AMOUNT');
    });

    it('should return 404 if user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/users/balance/deduct')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deductFundsData)
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('GET /api/users/balance/history', () => {
    it('should return balance history successfully', async () => {
      const mockTransactions = [
        {
          id: 'trans-1',
          user_id: mockUser.id,
          type: 'payment' as const,
          amount: 50.00,
          currency: 'USD',
          status: 'completed' as const,
          description: 'Top-up',
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
          processed_at: new Date()
        },
        {
          id: 'trans-2',
          user_id: mockUser.id,
          type: 'withdrawal' as const,
          amount: 25.00,
          currency: 'USD',
          status: 'completed' as const,
          description: 'Withdrawal',
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
          processed_at: new Date()
        }
      ];

      mockTransactionModel.list.mockResolvedValue({
        transactions: mockTransactions,
        total: 2
      });

      const response = await request(app)
        .get('/api/users/balance/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          transactions: expect.arrayContaining([
            expect.objectContaining({
              id: 'trans-1',
              user_id: mockUser.id,
              type: 'payment',
              amount: 50.00,
              currency: 'USD',
              status: 'completed',
              description: 'Top-up',
              metadata: {},
              created_at: expect.any(String),
              updated_at: expect.any(String),
              processed_at: expect.any(String)
            }),
            expect.objectContaining({
              id: 'trans-2',
              user_id: mockUser.id,
              type: 'withdrawal',
              amount: 25.00,
              currency: 'USD',
              status: 'completed',
              description: 'Withdrawal',
              metadata: {},
              created_at: expect.any(String),
              updated_at: expect.any(String),
              processed_at: expect.any(String)
            })
          ]),
          pagination: {
            total: 2,
            page: 1,
            limit: 20,
            pages: 1
          }
        }
      });

      expect(mockTransactionModel.list).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          page: 1,
          limit: 20
        })
      );
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/users/balance/history')
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should handle query parameters correctly', async () => {
      mockTransactionModel.list.mockResolvedValue({
        transactions: [],
        total: 0
      });

      await request(app)
        .get('/api/users/balance/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: '2',
          limit: '10',
          type: 'payment',
          status: 'completed'
        })
        .expect(200);

      expect(mockTransactionModel.list).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          page: 2,
          limit: 10,
          type: 'payment',
          status: 'completed'
        })
      );
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/users/balance/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 'invalid',
          limit: '200' // exceeds max limit
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});