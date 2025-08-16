// Jest setup file

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('$2a$12$hashedpassword')),
  compare: jest.fn(() => Promise.resolve(true)),
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

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn((payload, secret, _options) => {
    // Create a predictable token based on payload
    if (payload.userId === 'non-existent-user') {
      return 'valid-token-nonexistent-user';
    }
    if (secret === process.env['JWT_REFRESH_SECRET'] || secret === 'your-refresh-secret-key') {
      return 'valid-refresh-token';
    }
    return 'valid-jwt-token';
  }),
  verify: jest.fn((token, _secret) => {
    if (token === 'invalid-token' || token === 'invalid-refresh-token') {
      const error = new Error('jwt malformed');
      error.name = 'JsonWebTokenError';
      throw error;
    }
    if (token === 'expired-token') {
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      throw error;
    }
    // For valid tokens, extract userId from token name
    if (token === 'valid-token-nonexistent-user') {
      return { userId: 'non-existent-user', email: 'test@example.com', role: 'user' };
    }
    if (token === 'valid-token-nonexistent-user-optional') {
      return { userId: 'non-existent-user', email: 'test@example.com', role: 'user' };
    }
    // Default valid token - accept any other token as valid
    return { userId: '123e4567-e89b-12d3-a456-426614174000', email: 'test@example.com', role: 'user' };
  }),
}));

// Mock database pool to avoid connection issues
jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn(),
    end: jest.fn(),
  },
  testConnection: jest.fn(() => Promise.resolve(true)),
}));

// Mock all models to avoid database calls
jest.mock('../models/User', () => ({
  UserModel: {
    create: jest.fn().mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'user',
      balance: 0,
      email_verified: false,
      created_at: new Date(),
      updated_at: new Date()
    }),
    findById: jest.fn().mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'user',
      balance: 0,
      email_verified: true
    }),
    findByEmail: jest.fn().mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      password_hash: '$2a$12$hashedpassword',
      first_name: 'Test',
      last_name: 'User',
      role: 'user',
      email_verified: true
    }),
    update: jest.fn().mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      first_name: 'Updated',
      last_name: 'User'
    }),
    updateBalance: jest.fn().mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      balance: 100
    }),
    verifyPassword: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
    list: jest.fn().mockResolvedValue({
      users: [],
      total: 0
    }),
    verifyEmail: jest.fn().mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email_verified: true
    }),
    updatePassword: jest.fn().mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000'
    }),
  },
}));

jest.mock('../models/Bot', () => ({
  BotModel: {
    create: jest.fn().mockResolvedValue({
      id: '456e7890-e89b-12d3-a456-426614174000',
      name: 'Test Bot',
      telegram_bot_id: '123456789',
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    }),
    findById: jest.fn().mockResolvedValue({
      id: '456e7890-e89b-12d3-a456-426614174000',
      name: 'Test Bot',
      status: 'active'
    }),
    findByTelegramId: jest.fn().mockResolvedValue({
      id: '456e7890-e89b-12d3-a456-426614174000',
      telegram_bot_id: '123456789'
    }),
    findByUserId: jest.fn().mockResolvedValue([]),
    list: jest.fn().mockResolvedValue({
      bots: [],
      total: 0
    }),
    update: jest.fn().mockResolvedValue({
      id: '456e7890-e89b-12d3-a456-426614174000',
      name: 'Updated Bot'
    }),
    updateStatus: jest.fn().mockResolvedValue({
      id: '456e7890-e89b-12d3-a456-426614174000',
      status: 'inactive'
    }),
    delete: jest.fn().mockResolvedValue(true),
    getBotStats: jest.fn().mockResolvedValue({
      total_modules: 0,
      active_modules: 0,
      total_revenue: 0,
      monthly_revenue: 0
    }),
    getActiveModules: jest.fn().mockResolvedValue([]),
    getDecryptedToken: jest.fn().mockResolvedValue('decrypted-token'),
  },
}));

jest.mock('../models/Module', () => ({
  ModuleModel: {
    create: jest.fn().mockResolvedValue({
      id: 'module-id-123',
      name: 'Test Module',
      status: 'approved',
      created_at: new Date(),
      updated_at: new Date()
    }),
    findById: jest.fn().mockResolvedValue({
      id: 'module-id-123',
      name: 'Test Module',
      status: 'approved'
    }),
    getCatalog: jest.fn().mockResolvedValue({
      modules: [],
      total: 0
    }),
    getApprovedModules: jest.fn().mockResolvedValue([]),
    getCategories: jest.fn().mockResolvedValue([]),
    searchModules: jest.fn().mockResolvedValue({
      modules: [],
      total: 0
    }),
    getPopularModules: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({
      id: 'module-id-123',
      name: 'Updated Module'
    }),
    updateStatus: jest.fn().mockResolvedValue({
      id: 'module-id-123',
      status: 'approved'
    }),
    delete: jest.fn().mockResolvedValue(true),
    getModuleStats: jest.fn().mockResolvedValue({
      total_installations: 0,
      total_revenue: 0,
      average_rating: 0,
      total_ratings: 0
    }),
  },
}));

jest.mock('../models/Transaction', () => ({
  TransactionModel: {
    create: jest.fn().mockResolvedValue({
      id: 'transaction-id-123',
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      amount: 100,
      type: 'deposit',
      status: 'completed',
      created_at: new Date(),
      updated_at: new Date()
    }),
    findById: jest.fn().mockResolvedValue({
      id: 'transaction-id-123',
      status: 'completed'
    }),
    list: jest.fn().mockResolvedValue({
      transactions: [],
      total: 0
    }),
    update: jest.fn().mockResolvedValue({
      id: 'transaction-id-123'
    }),
    updateStatus: jest.fn().mockResolvedValue({
      id: 'transaction-id-123',
      status: 'completed'
    }),
    delete: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../models/EmailVerificationToken', () => ({
  EmailVerificationTokenModel: {
    create: jest.fn().mockResolvedValue({
      id: 'token-id-123',
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      token: 'verification-token',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      created_at: new Date()
    }),
    findByToken: jest.fn().mockResolvedValue({
      id: 'token-id-123',
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      token: 'verification-token'
    }),
    verifyAndDelete: jest.fn().mockResolvedValue('123e4567-e89b-12d3-a456-426614174000'),
    deleteExpired: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('../models/PasswordResetToken', () => ({
  PasswordResetTokenModel: {
    create: jest.fn().mockResolvedValue({
      id: 'reset-token-id-123',
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      token: 'reset-token',
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      created_at: new Date()
    }),
    findByToken: jest.fn().mockResolvedValue({
      id: 'reset-token-id-123',
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      token: 'reset-token'
    }),
    findByUserId: jest.fn().mockResolvedValue([{
      id: 'reset-token-id-123',
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      token: 'reset-token',
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      created_at: new Date()
    }]),
    verifyAndDelete: jest.fn().mockResolvedValue('123e4567-e89b-12d3-a456-426614174000'),
    deleteExpired: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('../models/BotModuleActivation', () => ({
  BotModuleActivationModel: {
    findByBotId: jest.fn(),
    deactivateAll: jest.fn(),
  },
}));

// Set test environment variables
process.env['NODE_ENV'] = 'test';
process.env['BOT_TOKEN_SECRET'] = 'test-secret-key';

// Mock authentication middleware to avoid JWT issues in tests
jest.mock('../middleware/authMiddleware', () => ({
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Access token is required',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    if (token === 'invalid-token') {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    if (token === 'valid-token-nonexistent-user') {
      return res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Extract userId from token for integration tests
    let userId = '123e4567-e89b-12d3-a456-426614174000';
    if (token.startsWith('access-token-')) {
      userId = token.replace('access-token-', '');
    }
    
    // Set user for valid tokens
    req.user = {
      userId: userId,
      email: 'test@example.com',
      role: 'user'
    };
    
    next();
  }),
  requireRole: jest.fn((roles: string | string[]) => (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this action',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    next();
  }),
  requireEmailVerification: jest.fn((req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  }),
  optionalAuth: jest.fn((req: any, _res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token && token !== 'invalid-token') {
      req.user = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'user'
      };
    }
    
    next();
  }),
  rateLimit: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  clearRateLimitData: jest.fn(),
}));

// Mock email service
jest.mock('../services/emailService', () => ({
  sendVerificationEmail: jest.fn((email: string) => {
    if (email.includes('fail')) {
      return Promise.reject(new Error('Email service error'));
    }
    return Promise.resolve();
  }),
  sendWelcomeEmail: jest.fn((email: string) => {
    if (email.includes('fail')) {
      return Promise.reject(new Error('Email service error'));
    }
    return Promise.resolve();
  }),
  sendPasswordResetEmail: jest.fn((email: string) => {
    if (email.includes('fail')) {
      return Promise.reject(new Error('Email service error'));
    }
    return Promise.resolve();
  }),
}));

// Mock multer
jest.mock('multer', () => {
  const multer = () => ({
    single: () => (req: any, _res: any, next: any) => {
      // Only add file if the request has multipart/form-data and file attachment
      // In supertest, .attach() sets the content-type to multipart/form-data
      const hasMultipartData = req.headers['content-type']?.includes('multipart/form-data');
      
      if (hasMultipartData) {
        req.file = {
          fieldname: 'avatar',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          destination: 'uploads/avatars',
          filename: `${req.user?.userId || 'user'}-${Date.now()}.jpg`,
          path: `uploads/avatars/${req.user?.userId || 'user'}-${Date.now()}.jpg`,
          size: 1024
        };
      }
      // If no multipart data, req.file remains undefined
      next();
    },
    memoryStorage: jest.fn(),
    diskStorage: jest.fn()
  });
  
  multer.memoryStorage = jest.fn();
  multer.diskStorage = jest.fn();
  
  return multer;
});