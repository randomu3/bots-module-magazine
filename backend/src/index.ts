import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import pool, { testConnection } from './config/database';
// import redis, { testRedisConnection } from './config/redis';
// import { verifyEmailConfig } from './services/emailService';
// import { SchedulerService } from './services/schedulerService';

// Import routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import botRoutes from './routes/botRoutes';
import moduleRoutes from './routes/moduleRoutes';
// import paymentRoutes from './routes/paymentRoutes';
// import withdrawalRoutes from './routes/withdrawalRoutes';
// import referralRoutes from './routes/referralRoutes';
// import analyticsRoutes from './routes/analyticsRoutes';
// import notificationRoutes from './routes/notificationRoutes';
// import broadcastRoutes from './routes/broadcastRoutes';
// import subscriberRoutes from './routes/subscriberRoutes';
// import supportRoutes from './routes/supportRoutes';
// import feedbackRoutes from './routes/feedbackRoutes';
// import adminRoutes from './routes/adminRoutes';

// Import monitoring and logging middleware
// import { requestLoggingMiddleware, errorLoggingMiddleware, rateLimitLoggingMiddleware } from './middleware/loggingMiddleware';
// import { metricsMiddleware, metricsEndpoint } from './middleware/metricsMiddleware';
// import { createServiceLogger } from './utils/logger';
// import { createHealthCheckEndpoint, createReadinessProbe, createLivenessProbe } from './utils/healthCheck';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3001;
// const logger = createServiceLogger('main');

// Rate limiting with logging
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Security and basic middleware
app.use(helmet());
app.use(cors({
  origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  credentials: true,
}));

// Monitoring middleware (before rate limiting to capture all requests)
// app.use(metricsMiddleware);
// app.use(requestLoggingMiddleware);

// Rate limiting with logging
app.use(limiter);
// app.use(rateLimitLoggingMiddleware);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// Health check endpoints
// app.get('/health', createHealthCheckEndpoint(pool, null));
// app.get('/health/ready', createReadinessProbe(pool, null));
// app.get('/health/live', createLivenessProbe());

// Metrics endpoint for Prometheus
app.get('/metrics', metricsEndpoint);

// Basic API route
app.get('/api', (_req, res) => {
  res.json({
    message: 'Telegram Bot Modules Platform API',
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/modules', moduleRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/withdrawals', withdrawalRoutes);
// app.use('/api/referrals', referralRoutes);
// app.use('/api/analytics', analyticsRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/broadcasts', broadcastRoutes);
// app.use('/api/subscribers', subscriberRoutes);
// app.use('/api/support', supportRoutes);
// app.use('/api/feedback', feedbackRoutes);
// app.use('/api/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  console.warn('404 - Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested route was not found',
      timestamp: new Date().toISOString(),
    },
  });
});

// Error handling middleware
// app.use(errorLoggingMiddleware);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error in error handler', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  });
  
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }
  });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.info(`Received ${signal}, starting graceful shutdown`);
  
  try {
    // Close database connections
    await pool.end();
    console.info('Database connections closed');
    
    // Close Redis connection
    // redis.disconnect();
    // logger.info('Redis connection closed');
    
    console.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error during graceful shutdown', { error: errorMessage });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
  process.exit(1);
});

// Start server only if not in test environment
if (process.env['NODE_ENV'] !== 'test') {
  const server = app.listen(PORT, async () => {
    logger.info(`Server started successfully`, {
      port: PORT,
      environment: process.env['NODE_ENV'] || 'development',
      nodeVersion: process.version,
    });
    
    // Test database connection
    await testConnection();
    
    // Test Redis connection
    // await testRedisConnection();
    
    // Verify email service configuration
    await verifyEmailConfig();
    
    // Start scheduled jobs
    SchedulerService.startScheduledJobs();
  });

  // Handle server errors
  server.on('error', (error: Error) => {
    logger.error('Server error', { error: error.message });
  });
}

export default app;