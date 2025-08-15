import { Request, Response, NextFunction } from 'express';
// Don't use the global setup for this test
jest.unmock('../../middleware/authMiddleware');

import { 
  authenticateToken, 
  requireRole, 
  requireEmailVerification, 
  optionalAuth,
  rateLimit,
  clearRateLimitData
} from '../../middleware/authMiddleware';
import { UserModel } from '../../models/User';

// Mock the UserModel
jest.mock('../../models/User');
const mockedUserModel = UserModel as jest.Mocked<typeof UserModel>;

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      ip: '127.0.0.1'
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {

    it('should authenticate valid token successfully', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'user'
      };

      const token = 'valid-token';

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toEqual({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return error for missing token', async () => {
      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Access token is required',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return error for invalid token format', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat'
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Access token is required',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return error for invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return error for expired token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token'
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return error if user no longer exists', async () => {
      const token = 'valid-token-nonexistent-user';

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      mockedUserModel.findById.mockResolvedValue(null);

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      mockRequest.user = {
        userId: 'user-id-123',
        email: 'test@example.com',
        role: 'user'
      };
    });

    it('should allow access for correct single role', () => {
      const middleware = requireRole('user');
      
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access for correct role in array', () => {
      const middleware = requireRole(['user', 'admin']);
      
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for incorrect role', () => {
      const middleware = requireRole('admin');
      
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this action',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny access if user not authenticated', () => {
      delete mockRequest.user;
      const middleware = requireRole('user');
      
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('requireEmailVerification', () => {
    beforeEach(() => {
      mockRequest.user = {
        userId: 'user-id-123',
        email: 'test@example.com',
        role: 'user'
      };
    });

    it('should allow access for verified user', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        email_verified: true
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);

      await requireEmailVerification(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for unverified user', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        email_verified: false
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);

      await requireEmailVerification(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Email verification required',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny access if user not authenticated', async () => {
      delete mockRequest.user;

      await requireEmailVerification(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: expect.any(String)
        }
      });
    });

    it('should deny access if user not found', async () => {
      mockedUserModel.findById.mockResolvedValue(null);

      await requireEmailVerification(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('optionalAuth', () => {

    it('should continue without authentication if no token provided', async () => {
      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should authenticate if valid token provided', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'user'
      };

      const token = 'valid-token-optional';

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toEqual({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication if invalid token provided', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication if user not found', async () => {
      const token = 'valid-token-nonexistent-user-optional';

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      mockedUserModel.findById.mockResolvedValue(null);

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('rateLimit', () => {
    beforeEach(() => {
      (mockRequest as any).ip = '127.0.0.1';
      // Clear any existing rate limit data
      clearRateLimitData();
      jest.clearAllTimers();
    });

    afterEach(() => {
      clearRateLimitData();
      jest.clearAllTimers();
    });

    it('should allow requests within limit', () => {
      const middleware = rateLimit(5, 60000); // 5 requests per minute
      
      // First request should pass
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding limit', () => {
      const middleware = rateLimit(2, 60000); // 2 requests per minute
      
      // First two requests should pass
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      // Third request should be blocked
      jest.clearAllMocks();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reset counter after window expires', (done) => {
      // Use unique IP to avoid conflicts with other tests
      const testIP = '192.168.1.100';
      (mockRequest as any).ip = testIP;
      
      const middleware = rateLimit(1, 100); // 1 request per 100ms
      
      // First request should pass
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      
      // Second request should be blocked
      jest.clearAllMocks();
      (mockRequest as any).ip = testIP;
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      
      // Wait for window to expire and try again
      setTimeout(() => {
        jest.clearAllMocks();
        (mockRequest as any).ip = testIP;
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
        done();
      }, 150);
    });

    it('should handle different IPs separately', () => {
      const middleware = rateLimit(1, 60000); // 1 request per minute
      
      // Use unique IPs for this test
      const ip1 = '10.0.0.1';
      const ip2 = '10.0.0.2';
      
      // First IP - should pass
      (mockRequest as any).ip = ip1;
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      
      // Second IP should not be affected
      jest.clearAllMocks();
      (mockRequest as any).ip = ip2;
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});