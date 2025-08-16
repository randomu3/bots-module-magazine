import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({
  register,
  prefix: 'telegram_bot_platform_',
});

// HTTP request duration histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'telegram_bot_platform_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

// HTTP request counter
const httpRequestsTotal = new promClient.Counter({
  name: 'telegram_bot_platform_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Active connections gauge
const activeConnections = new promClient.Gauge({
  name: 'telegram_bot_platform_active_connections',
  help: 'Number of active connections',
});

// Database query duration histogram
const dbQueryDuration = new promClient.Histogram({
  name: 'telegram_bot_platform_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5],
});

// Database connection pool gauge
const dbConnectionPool = new promClient.Gauge({
  name: 'telegram_bot_platform_db_connection_pool',
  help: 'Database connection pool status',
  labelNames: ['status'], // 'active', 'idle', 'waiting'
});

// Redis operation duration histogram
const redisOperationDuration = new promClient.Histogram({
  name: 'telegram_bot_platform_redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1],
});

// Business metrics
const userRegistrations = new promClient.Counter({
  name: 'telegram_bot_platform_user_registrations_total',
  help: 'Total number of user registrations',
});

const botConnections = new promClient.Counter({
  name: 'telegram_bot_platform_bot_connections_total',
  help: 'Total number of bot connections',
});

const moduleActivations = new promClient.Counter({
  name: 'telegram_bot_platform_module_activations_total',
  help: 'Total number of module activations',
  labelNames: ['module_id', 'module_name'],
});

const paymentTransactions = new promClient.Counter({
  name: 'telegram_bot_platform_payment_transactions_total',
  help: 'Total number of payment transactions',
  labelNames: ['status', 'type'],
});

const paymentAmount = new promClient.Histogram({
  name: 'telegram_bot_platform_payment_amount',
  help: 'Payment transaction amounts',
  labelNames: ['currency', 'type'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});

// Error counters
const applicationErrors = new promClient.Counter({
  name: 'telegram_bot_platform_application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['error_type', 'service'],
});

const telegramApiErrors = new promClient.Counter({
  name: 'telegram_bot_platform_telegram_api_errors_total',
  help: 'Total number of Telegram API errors',
  labelNames: ['error_code', 'method'],
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbConnectionPool);
register.registerMetric(redisOperationDuration);
register.registerMetric(userRegistrations);
register.registerMetric(botConnections);
register.registerMetric(moduleActivations);
register.registerMetric(paymentTransactions);
register.registerMetric(paymentAmount);
register.registerMetric(applicationErrors);
register.registerMetric(telegramApiErrors);

// Middleware to collect HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Increment active connections
  activeConnections.inc();
  
  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route?.path || req.path;
    
    // Record metrics
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
    
    // Decrement active connections
    activeConnections.dec();
    
    return originalEnd.apply(this, args);
  };
  
  next();
};

// Metrics endpoint
export const metricsEndpoint = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end('Error generating metrics');
  }
};

// Helper functions to record business metrics
export const recordUserRegistration = () => {
  userRegistrations.inc();
};

export const recordBotConnection = () => {
  botConnections.inc();
};

export const recordModuleActivation = (moduleId: string, moduleName: string) => {
  moduleActivations.labels(moduleId, moduleName).inc();
};

export const recordPaymentTransaction = (status: string, type: string, amount?: number, currency?: string) => {
  paymentTransactions.labels(status, type).inc();
  
  if (amount && currency) {
    paymentAmount.labels(currency, type).observe(amount);
  }
};

export const recordApplicationError = (errorType: string, service: string) => {
  applicationErrors.labels(errorType, service).inc();
};

export const recordTelegramApiError = (errorCode: string, method: string) => {
  telegramApiErrors.labels(errorCode, method).inc();
};

export const recordDbQuery = (operation: string, table: string, duration: number) => {
  dbQueryDuration.labels(operation, table).observe(duration / 1000);
};

export const recordRedisOperation = (operation: string, duration: number) => {
  redisOperationDuration.labels(operation).observe(duration / 1000);
};

export const updateDbConnectionPool = (active: number, idle: number, waiting: number) => {
  dbConnectionPool.labels('active').set(active);
  dbConnectionPool.labels('idle').set(idle);
  dbConnectionPool.labels('waiting').set(waiting);
};

export { register };