import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createRequestLogger, logPerformance } from '../utils/logger';

// Extend Request interface to include logger and requestId
declare global {
  namespace Express {
    interface Request {
      logger: any;
      requestId: string;
      startTime: number;
    }
  }
}

// Request logging middleware
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID
  req.requestId = uuidv4();
  req.startTime = Date.now();
  
  // Create request-specific logger
  const userId = (req as any).user?.id;
  req.logger = createRequestLogger(req.requestId, userId);
  
  // Log incoming request
  req.logger.http('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId,
  });
  
  // Log request body for non-GET requests (excluding sensitive data)
  if (req.method !== 'GET' && req.body) {
    const sanitizedBody = sanitizeRequestBody(req.body);
    if (Object.keys(sanitizedBody).length > 0) {
      req.logger.debug('Request body', { body: sanitizedBody });
    }
  }
  
  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - req.startTime;
    
    // Log response
    req.logger.http('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      responseSize: JSON.stringify(body).length,
    });
    
    // Log performance metrics
    logPerformance(`${req.method} ${req.url}`, req.startTime, {
      statusCode: res.statusCode,
      userId,
    });
    
    return originalJson.call(this, body);
  };
  
  next();
};

// Error logging middleware
export const errorLoggingMiddleware = (error: any, req: Request, res: Response, next: NextFunction) => {
  const duration = Date.now() - req.startTime;
  
  // Log error with full context
  req.logger.error('Request failed with error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    method: req.method,
    url: req.url,
    statusCode: error.statusCode || 500,
    duration,
    userId: (req as any).user?.id,
    body: sanitizeRequestBody(req.body),
  });
  
  next(error);
};

// Sanitize request body to remove sensitive information
const sanitizeRequestBody = (body: any): any => {
  if (!body || typeof body !== 'object') {
    return {};
  }
  
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'auth',
    'credential',
    'private',
  ];
  
  const sanitized = { ...body };
  
  const sanitizeObject = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = sanitizeObject(value);
        }
      }
      return result;
    }
    
    return obj;
  };
  
  return sanitizeObject(sanitized);
};

// Rate limiting logging middleware
export const rateLimitLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(body: any) {
    if (res.statusCode === 429) {
      req.logger.warn('Rate limit exceeded', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id,
      });
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};