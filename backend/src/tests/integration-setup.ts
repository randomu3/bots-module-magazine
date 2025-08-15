// Integration test setup - uses real models with mocked database

// Import and clear existing mocks first
import './setup';

// Clear model mocks for integration tests
jest.unmock('../models/User');
jest.unmock('../models/Bot');
jest.unmock('../models/Module');
jest.unmock('../models/Transaction');
jest.unmock('../models/EmailVerificationToken');
jest.unmock('../models/PasswordResetToken');

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn((password: string) => {
    if (password === 'newpassword123') {
      return Promise.resolve('$2a$12$newhashedpassword');
    }
    return Promise.resolve('$2a$12$hashedpassword');
  }),
  compare: jest.fn((password: string, hash: string) => {
    // Return true for correct password combinations
    if (hash === '$2a$12$hashedpassword') {
      return Promise.resolve(password === 'password123' || password === 'testpassword123' || password === 'oldpassword123');
    }
    if (hash === '$2a$12$newhashedpassword') {
      return Promise.resolve(password === 'newpassword123');
    }
    return Promise.resolve(false);
  }),
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'ABCD1234'),
  })),
  scryptSync: jest.fn(() => Buffer.from('key')),
  createCipher: jest.fn(() => ({
    update: jest.fn(() => 'encrypted'),
    final: jest.fn(() => ''),
  })),
  createDecipher: jest.fn(() => ({
    update: jest.fn(() => 'decrypted'),
    final: jest.fn(() => ''),
  })),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mocked-hash'),
  })),
}));

// Mock database pool with realistic responses
const mockQuery = jest.fn();

jest.mock('../config/database', () => ({
  query: mockQuery,
  pool: {
    query: mockQuery,
    end: jest.fn(),
  },
  testConnection: jest.fn(() => Promise.resolve(true)),
}));

// Set test environment variables
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-secret-key';
process.env['BOT_TOKEN_SECRET'] = 'test-secret-key';

// Override JWT mock for integration tests
jest.doMock('jsonwebtoken', () => ({
  sign: jest.fn((payload, secret, _options) => {
    // Create unique tokens based on payload and secret
    const tokenBase = `${payload.userId || 'default'}-${Date.now()}-${Math.random()}`;
    if (secret === process.env['JWT_REFRESH_SECRET'] || secret === 'your-refresh-secret-key') {
      return `refresh-${tokenBase}`;
    }
    return `access-${tokenBase}`;
  }),
  verify: jest.fn((token, _secret) => {
    if (token === 'invalid-token' || token === 'invalid-refresh-token' || token === 'invalid-token-123') {
      const error = new Error('jwt malformed');
      error.name = 'JsonWebTokenError';
      throw error;
    }
    if (token === 'expired-token') {
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      throw error;
    }
    
    // Extract user info from token
    if (token.startsWith('access-') || token.startsWith('refresh-')) {
      const parts = token.split('-');
      const userId = parts[1] || 'default-user-id';
      
      // Find user in test data
      const user = Object.values(testData).find((u: any) => u.id === userId);
      if (user) {
        return { 
          userId: user.id, 
          email: user.email, 
          role: user.role || 'user' 
        };
      }
    }
    
    // Default fallback
    return { userId: 'default-user-id', email: 'test@example.com', role: 'user' };
  }),
}));

// In-memory storage for test data
const testData: { [key: string]: any } = {};

// Setup mock database responses for integration tests
beforeEach(() => {
  jest.clearAllMocks();
  
  // Clear test data
  Object.keys(testData).forEach(key => delete testData[key]);
  
  // Default mock responses
  mockQuery.mockImplementation((query: string, values?: any[]) => {
    // User creation
    if (query.includes('INSERT INTO users')) {
      const email = values?.[0] || 'test@example.com';
      
      // Check if user with this email already exists
      const existingUser = Object.values(testData).find((u: any) => u.email === email);
      if (existingUser) {
        const error = new Error('duplicate key value violates unique constraint "users_email_key"') as any;
        error.code = '23505';
        error.constraint = 'users_email_key';
        return Promise.reject(error);
      }
      
      const userId = `123e4567-e89b-12d3-a456-${Date.now().toString().slice(-12)}`;
      const mockUser = {
        id: userId,
        email: email,
        password_hash: values?.[1] || '$2a$12$hashedpassword',
        first_name: values?.[2] || 'John',
        last_name: values?.[3] || 'Doe',
        role: values?.[4] || 'user',
        referral_code: values?.[5] || 'ABCD1234',
        referred_by: values?.[6] || null,
        balance: 0,
        email_verified: false,
        theme_preference: 'system',
        created_at: new Date(),
        updated_at: new Date(),
      };
      testData[`user_${userId}`] = mockUser;
      testData[`email_${email}`] = mockUser;
      
      // Auto-create verification token for new users
      const verificationToken = {
        id: `token-${Date.now()}`,
        user_id: userId,
        token: 'ABCD1234',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        created_at: new Date(),
      };
      testData[`token_${verificationToken.token}`] = verificationToken;
      testData[`user_tokens_${userId}`] = [verificationToken];
      
      return Promise.resolve({ rows: [mockUser] });
    }
    
    // User lookup by ID
    if (query.includes('SELECT * FROM users WHERE id')) {
      const userId = values?.[0];
      const user = testData[`user_${userId}`] || Object.values(testData).find((u: any) => u.id === userId);
      return Promise.resolve({ rows: user ? [user] : [] });
    }
    
    // User lookup by email
    if (query.includes('SELECT * FROM users WHERE email')) {
      const email = values?.[0];
      const user = testData[`email_${email}`];
      return Promise.resolve({ rows: user ? [user] : [] });
    }
    
    // User update
    if (query.includes('UPDATE users')) {
      const userId = values?.[0];
      let user = testData[`user_${userId}`] || Object.values(testData).find((u: any) => u.id === userId);
      if (user) {
        // Update fields based on query
        if (query.includes('first_name')) user.first_name = values?.[1] || 'Jane';
        if (query.includes('theme_preference')) user.theme_preference = values?.[2] || 'dark';
        if (query.includes('balance')) user.balance = values?.[1] || 150;
        if (query.includes('email_verified')) user.email_verified = true;
        if (query.includes('password_hash')) user.password_hash = values?.[1] || '$2a$12$newhashedpassword';
        user.updated_at = new Date();
        return Promise.resolve({ rows: [user] });
      }
      return Promise.resolve({ rows: [] });
    }
    
    // Bot creation
    if (query.includes('INSERT INTO bots')) {
      const botId = `456e7890-e89b-12d3-a456-${Date.now().toString().slice(-12)}`;
      const mockBot = {
        id: botId,
        user_id: values?.[0] || '123e4567-e89b-12d3-a456-426614174000',
        telegram_bot_id: values?.[1] || '123456789',
        name: values?.[2] || 'Test Bot',
        username: values?.[3] || 'testbot',
        description: values?.[4] || 'A test bot',
        token_hash: 'encrypted_token',
        webhook_url: values?.[6] || 'https://example.com/webhook',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };
      testData[`bot_${botId}`] = mockBot;
      return Promise.resolve({ rows: [mockBot] });
    }
    
    // Bot lookup by ID
    if (query.includes('SELECT * FROM bots WHERE id')) {
      const botId = values?.[0];
      const bot = testData[`bot_${botId}`] || Object.values(testData).find((b: any) => b.id === botId);
      return Promise.resolve({ rows: bot ? [bot] : [] });
    }
    
    // Bot lookup by telegram ID
    if (query.includes('SELECT * FROM bots WHERE telegram_bot_id')) {
      const telegramId = values?.[0];
      const bot = Object.values(testData).find((b: any) => b.telegram_bot_id === telegramId);
      return Promise.resolve({ rows: bot ? [bot] : [] });
    }
    
    // Bot status update
    if (query.includes('UPDATE bots') && query.includes('status')) {
      const botId = values?.[0];
      let bot = testData[`bot_${botId}`] || Object.values(testData).find((b: any) => b.id === botId);
      if (bot) {
        bot.status = values?.[1] || 'inactive';
        bot.updated_at = new Date();
        return Promise.resolve({ rows: [bot] });
      }
      return Promise.resolve({ rows: [] });
    }
    
    // Module creation
    if (query.includes('INSERT INTO modules')) {
      const moduleId = `789e0123-e89b-12d3-a456-${Date.now().toString().slice(-12)}`;
      const mockModule = {
        id: moduleId,
        name: values?.[0] || 'Test Module',
        description: values?.[1] || 'A test module for earning',
        category: values?.[2] || 'advertising',
        price: values?.[3] || 9.99,
        developer_id: values?.[4] || '123e4567-e89b-12d3-a456-426614174000',
        webhook_required: values?.[5] || true,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      };
      testData[`module_${moduleId}`] = mockModule;
      return Promise.resolve({ rows: [mockModule] });
    }
    
    // Module lookup
    if (query.includes('SELECT * FROM modules WHERE id')) {
      const moduleId = values?.[0];
      const module = testData[`module_${moduleId}`] || Object.values(testData).find((m: any) => m.id === moduleId);
      return Promise.resolve({ rows: module ? [module] : [] });
    }
    
    // Module status update
    if (query.includes('UPDATE modules') && query.includes('status')) {
      const moduleId = values?.[0];
      let module = testData[`module_${moduleId}`] || Object.values(testData).find((m: any) => m.id === moduleId);
      if (module) {
        module.status = values?.[1] || 'approved';
        module.updated_at = new Date();
        return Promise.resolve({ rows: [module] });
      }
      return Promise.resolve({ rows: [] });
    }
    
    // Transaction creation
    if (query.includes('INSERT INTO transactions')) {
      const transactionId = `abc12345-e89b-12d3-a456-${Date.now().toString().slice(-12)}`;
      const mockTransaction = {
        id: transactionId,
        user_id: values?.[0] || '123e4567-e89b-12d3-a456-426614174000',
        type: values?.[1] || 'deposit',
        amount: values?.[2] || 25.50,
        currency: values?.[3] || 'USD',
        description: values?.[4] || 'Test payment',
        metadata: values?.[5] || {},
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      };
      testData[`transaction_${transactionId}`] = mockTransaction;
      return Promise.resolve({ rows: [mockTransaction] });
    }
    
    // Transaction lookup
    if (query.includes('SELECT * FROM transactions WHERE id')) {
      const transactionId = values?.[0];
      const transaction = testData[`transaction_${transactionId}`] || Object.values(testData).find((t: any) => t.id === transactionId);
      return Promise.resolve({ rows: transaction ? [transaction] : [] });
    }
    
    // Transaction status update
    if (query.includes('UPDATE transactions') && query.includes('status')) {
      const transactionId = values?.[0];
      let transaction = testData[`transaction_${transactionId}`] || Object.values(testData).find((t: any) => t.id === transactionId);
      if (transaction) {
        transaction.status = values?.[1] || 'completed';
        transaction.processed_at = new Date();
        transaction.updated_at = new Date();
        return Promise.resolve({ rows: [transaction] });
      }
      return Promise.resolve({ rows: [] });
    }
    
    // Email verification token creation
    if (query.includes('INSERT INTO email_verification_tokens')) {
      const tokenId = `token-${Date.now()}`;
      const userId = values?.[0] || 'user-123';
      const token = values?.[1] || 'ABCD1234';
      const mockToken = {
        id: tokenId,
        user_id: userId,
        token: token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        created_at: new Date(),
      };
      testData[`token_${token}`] = mockToken;
      
      // Also store by user_id for lookup
      if (!testData[`user_tokens_${userId}`]) {
        testData[`user_tokens_${userId}`] = [];
      }
      testData[`user_tokens_${userId}`].push(mockToken);
      
      return Promise.resolve({ rows: [mockToken] });
    }
    
    // Email verification token lookup by token
    if (query.includes('SELECT * FROM email_verification_tokens WHERE token')) {
      const token = values?.[0];
      const tokenData = testData[`token_${token}`];
      return Promise.resolve({ rows: tokenData ? [tokenData] : [] });
    }
    
    // Email verification token lookup by user_id
    if (query.includes('SELECT * FROM email_verification_tokens WHERE user_id')) {
      const userId = values?.[0];
      const userTokens = testData[`user_tokens_${userId}`] || [];
      return Promise.resolve({ rows: userTokens });
    }
    
    // Email verification token deletion by token
    if (query.includes('DELETE FROM email_verification_tokens WHERE token')) {
      const token = values?.[0];
      if (testData[`token_${token}`]) {
        delete testData[`token_${token}`];
        return Promise.resolve({ rowCount: 1 });
      }
      return Promise.resolve({ rowCount: 0 });
    }
    
    // User email verification update
    if (query.includes('UPDATE users') && query.includes('email_verified')) {
      const userId = values?.[0];
      const user = testData[`user_${userId}`];
      if (user) {
        user.email_verified = true;
        user.updated_at = new Date();
        return Promise.resolve({ rows: [user] });
      }
      return Promise.resolve({ rows: [] });
    }
    
    // Password reset token creation
    if (query.includes('INSERT INTO password_reset_tokens')) {
      const tokenId = `reset-token-${Date.now()}`;
      const userId = values?.[0] || 'user-123';
      const token = values?.[1] || 'RESET1234';
      const mockToken = {
        id: tokenId,
        user_id: userId,
        token: token,
        expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        created_at: new Date(),
      };
      testData[`reset_token_${token}`] = mockToken;
      testData[`user_reset_tokens_${userId}`] = [mockToken];
      return Promise.resolve({ rows: [mockToken] });
    }
    
    // Password reset token lookup by token
    if (query.includes('SELECT * FROM password_reset_tokens WHERE token')) {
      const token = values?.[0];
      const tokenData = testData[`reset_token_${token}`];
      return Promise.resolve({ rows: tokenData ? [tokenData] : [] });
    }
    
    // Password reset token lookup by user_id
    if (query.includes('SELECT * FROM password_reset_tokens WHERE user_id')) {
      const userId = values?.[0];
      const userTokens = testData[`user_reset_tokens_${userId}`] || [];
      return Promise.resolve({ rows: userTokens });
    }
    
    // User password update
    if (query.includes('UPDATE users') && query.includes('password_hash')) {
      const userId = values?.[0];
      const user = testData[`user_${userId}`];
      if (user) {
        user.password_hash = values?.[1] || '$2a$12$newhashedpassword';
        user.updated_at = new Date();
        return Promise.resolve({ rows: [user] });
      }
      return Promise.resolve({ rows: [] });
    }
    
    // Delete operations
    if (query.includes('DELETE FROM')) {
      return Promise.resolve({ rowCount: 1 });
    }
    
    // Default empty response
    return Promise.resolve({ rows: [] });
  });
});

export { mockQuery };