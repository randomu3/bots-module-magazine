import winston from 'winston';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Create log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, userId, requestId, ...meta } = info;
    
    const logEntry = {
      timestamp,
      level,
      message,
      service: service || 'backend',
      ...(userId && { userId }),
      ...(requestId && { requestId }),
      ...(Object.keys(meta).length > 0 && { meta }),
    };

    return JSON.stringify(logEntry);
  })
);

// Create console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, userId, requestId } = info;
    const serviceTag = service ? `[${service}]` : '';
    const userTag = userId ? `[User:${userId}]` : '';
    const reqTag = requestId ? `[Req:${requestId}]` : '';
    
    return `${timestamp} ${level} ${serviceTag}${userTag}${reqTag}: ${message}`;
  })
);

// Create transports
const transports = [];

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Ensure log directory exists
  const logDir = '/var/log/backend';
  
  transports.push(
    // All logs
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      format: logFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
    }),
    
    // Error logs only
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
    }),
    
    // HTTP logs
    new winston.transports.File({
      filename: path.join(logDir, 'http.log'),
      level: 'http',
      format: logFormat,
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 7,
    })
  );
} else {
  // Development file logging
  transports.push(
    new winston.transports.File({
      filename: 'logs/app.log',
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels: logLevels,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Create child logger with service context
export const createServiceLogger = (serviceName: string) => {
  return logger.child({ service: serviceName });
};

// Create request logger with context
export const createRequestLogger = (requestId: string, userId?: string) => {
  return logger.child({ requestId, userId });
};

// Performance monitoring helper
export const logPerformance = (operation: string, startTime: number, metadata?: any) => {
  const duration = Date.now() - startTime;
  logger.info(`Performance: ${operation} completed in ${duration}ms`, {
    operation,
    duration,
    ...metadata,
  });
  
  // Log slow operations as warnings
  if (duration > 1000) {
    logger.warn(`Slow operation detected: ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...metadata,
    });
  }
};

// Error logging helper
export const logError = (error: Error, context?: any) => {
  logger.error('Application error occurred', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  });
};

// Security event logging
export const logSecurityEvent = (event: string, details: any) => {
  logger.warn(`Security event: ${event}`, {
    securityEvent: event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

// Business event logging
export const logBusinessEvent = (event: string, details: any) => {
  logger.info(`Business event: ${event}`, {
    businessEvent: event,
    ...details,
  });
};

export default logger;