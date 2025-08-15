// This test file bypasses the global model mocks to test the actual model logic

// Mock the database pool before any imports
const mockQuery = jest.fn();
jest.doMock('../../config/database', () => ({
  query: mockQuery,
}));

// Mock bcryptjs for password operations
jest.doMock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('$2a$12$hashedpassword')),
  compare: jest.fn(() => Promise.resolve(true)),
}));

// Mock crypto for referral codes
jest.doMock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'ABCD1234'),
  })),
}));

// Clear the global model mock for this test
jest.doMock('../../models/User', () => {
  return jest.requireActual('../../models/User');
});

describe('UserModel Unit Tests', () => {
  let UserModel: any;

  beforeAll(async () => {
    // Import the actual model after setting up mocks
    const { UserModel: ActualUserModel } = await import('../../models/User');
    UserModel = ActualUserModel;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user with valid input', async () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      };

      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        balance: 0,
        email_verified: false,
        theme_preference: 'system',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await UserModel.create(input);

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          'test@example.com',
          expect.any(String), // hashed password
          'John',
          'Doe',
          'user',
          expect.any(String), // referral code
          undefined,
        ])
      );
    });

    it('should throw validation error for invalid email', async () => {
      const input = {
        email: 'invalid-email',
        password: 'password123',
      };

      await expect(UserModel.create(input)).rejects.toThrow('Validation error');
    });

    it('should throw validation error for short password', async () => {
      const input = {
        email: 'test@example.com',
        password: '123',
      };

      await expect(UserModel.create(input)).rejects.toThrow('Validation error');
    });

    it('should throw error for duplicate email', async () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
      };

      const dbError = new Error('Duplicate key') as any;
      dbError.code = '23505';
      dbError.constraint = 'users_email_key';

      mockQuery.mockRejectedValueOnce(dbError);

      await expect(UserModel.create(input)).rejects.toThrow('Email already exists');
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await UserModel.findById('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        ['123e4567-e89b-12d3-a456-426614174000']
      );
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await UserModel.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await UserModel.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await UserModel.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user with valid input', async () => {
      const input = {
        first_name: 'Jane',
        theme_preference: 'dark' as const,
      };

      const mockUpdatedUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        first_name: 'Jane',
        last_name: 'Doe',
        theme_preference: 'dark',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedUser] });

      const result = await UserModel.update('123e4567-e89b-12d3-a456-426614174000', input);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users\s+SET/),
        expect.arrayContaining(['123e4567-e89b-12d3-a456-426614174000'])
      );
    });

    it('should return existing user when no fields to update', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      };

      // Mock findById call
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await UserModel.update('123e4567-e89b-12d3-a456-426614174000', {});

      expect(result).toEqual(mockUser);
    });

    it('should throw validation error for invalid theme preference', async () => {
      const input = {
        theme_preference: 'invalid-theme' as any,
      };

      await expect(
        UserModel.update('123e4567-e89b-12d3-a456-426614174000', input)
      ).rejects.toThrow('Validation error');
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const mockUser = {
        password_hash: '$2a$12$hashedpassword',
      } as any;

      const result = await UserModel.verifyPassword(mockUser, 'correctpassword');

      expect(result).toBe(true);
    });
  });

  describe('updateBalance', () => {
    it('should update user balance', async () => {
      const mockUpdatedUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        balance: 150.00,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedUser] });

      const result = await UserModel.updateBalance('123e4567-e89b-12d3-a456-426614174000', 50.00);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users\s+SET balance = balance \+ \$2/),
        ['123e4567-e89b-12d3-a456-426614174000', 50.00]
      );
    });
  });

  describe('list', () => {
    it('should return paginated users list', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@example.com', role: 'user' },
        { id: '2', email: 'user2@example.com', role: 'admin' },
      ];

      // Mock count query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      // Mock data query
      mockQuery.mockResolvedValueOnce({ rows: mockUsers });

      const result = await UserModel.list({ page: 1, limit: 10 });

      expect(result).toEqual({
        users: mockUsers,
        total: 2,
      });
    });

    it('should filter users by role', async () => {
      const mockAdmins = [
        { id: '2', email: 'admin@example.com', role: 'admin' },
      ];

      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockQuery.mockResolvedValueOnce({ rows: mockAdmins });

      const result = await UserModel.list({ role: 'admin' });

      expect(result).toEqual({
        users: mockAdmins,
        total: 1,
      });
    });
  });
});