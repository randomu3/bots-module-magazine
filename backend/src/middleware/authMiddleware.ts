import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Middleware to verify JWT token
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Access token is required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if user still exists
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Add user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error: any) {
    console.error('Authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Middleware to check if user has required role
export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this action',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};

// Middleware to check if user's email is verified
export const requireEmailVerification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (!user.email_verified) {
      res.status(403).json({
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Email verification required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  } catch (error: any) {
    console.error('Email verification check error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify email status',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Optional authentication - doesn't fail if no token provided
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    // Verify token if provided
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if user still exists
    const user = await UserModel.findById(decoded.userId);
    if (user) {
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    }

    next();
  } catch (error: any) {
    // If token is invalid, continue without authentication
    // This allows the route to handle unauthenticated requests
    next();
  }
};

// Rate limiting middleware (basic implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, use a consistent identifier to properly test rate limiting
    const clientId = process.env['NODE_ENV'] === 'test' 
      ? 'test-client' // Use consistent ID for testing
      : req.ip || req.socket.remoteAddress || 'unknown';
    
    const now = Date.now();
    
    const clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      // Reset or initialize counter
      requestCounts.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }
    
    if (clientData.count >= maxRequests) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    clientData.count++;
    next();
  };
};

// Export function to clear rate limit data (for testing)
export const clearRateLimitData = () => {
  requestCounts.clear();
};

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [clientId, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(clientId);
    }
  }
}, 60000); // Clean up every minute