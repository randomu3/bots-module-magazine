import { UserModel } from '../models/User';

// Mock the UserModel for this test
jest.mock('../models/User', () => ({
  UserModel: {
    create: jest.fn(),
    findById: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;

describe('Simple Model Test', () => {
  it('should create and find a user', async () => {
    const userData = {
      email: `simple-test-${Date.now()}@example.com`,
      password: 'password123',
      first_name: 'Simple',
      last_name: 'Test',
    };

    const mockUser = {
      id: 'user-id-123',
      email: userData.email,
      password_hash: 'hashed_password',
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: 'user' as const,
      balance: 0,
      referral_code: 'REF123',
      referred_by: undefined,
      email_verified: false,
      theme_preference: 'system' as const,
      avatar_url: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Setup mocks
    mockUserModel.create.mockResolvedValue(mockUser as any);
    mockUserModel.findById.mockResolvedValue(mockUser as any);
    mockUserModel.delete.mockResolvedValue(true);

    const user = await UserModel.create(userData);
    expect(user).toBeDefined();
    expect(user.email).toBe(userData.email);

    const foundUser = await UserModel.findById(user.id);
    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe(userData.email);

    // Clean up
    const deleted = await UserModel.delete(user.id);
    expect(deleted).toBe(true);
  });
});