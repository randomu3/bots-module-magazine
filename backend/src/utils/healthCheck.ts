import { Request, Response } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { createServiceLogger } from './logger';

const logger = createServiceLogger('health-check');

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    telegram: ServiceHealth;
    email: ServiceHealth;
  };
  metrics: {
    memory: MemoryMetrics;
    cpu: number;
    activeConnections: number;
  };
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  lastCheck: string;
}

interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
}

class HealthChecker {
  private dbPool: Pool;
  private redis: Redis;
  
  constructor(dbPool: Pool, redis: Redis) {
    this.dbPool = dbPool;
    this.redis = redis;
  }
  
  async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const client = await this.dbPool.connect();
      await client.query('SELECT 1');
      client.release();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }
  
  async checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      await this.redis.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 500 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Redis health check failed', { error: error.message });
      
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }
  
  async checkTelegram(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Simple check to Telegram API
      const response = await fetch('https://api.telegram.org/bot/getMe', {
        method: 'POST',
        timeout: 5000,
      });
      
      const responseTime = Date.now() - startTime;
      
      // Even if the bot token is invalid, if we get a response, Telegram API is up
      return {
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Telegram API health check failed', { error: error.message });
      
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }
  
  async checkEmail(): Promise<ServiceHealth> {
    // For now, just return healthy since email is not critical for basic functionality
    // In production, you would check SMTP connection
    return {
      status: 'healthy',
      lastCheck: new Date().toISOString(),
    };
  }
  
  getMemoryMetrics(): MemoryMetrics {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    
    return {
      used: usedMemory,
      total: totalMemory,
      percentage: Math.round((usedMemory / totalMemory) * 100),
    };
  }
  
  getCpuUsage(): number {
    // Simple CPU usage approximation
    const usage = process.cpuUsage();
    return Math.round((usage.user + usage.system) / 1000000); // Convert to seconds
  }
  
  async performHealthCheck(): Promise<HealthCheckResult> {
    logger.info('Performing health check');
    
    const [database, redis, telegram, email] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkTelegram(),
      this.checkEmail(),
    ]);
    
    const services = { database, redis, telegram, email };
    
    // Determine overall status
    const serviceStatuses = Object.values(services).map(s => s.status);
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    
    if (serviceStatuses.includes('unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (serviceStatuses.includes('degraded')) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }
    
    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services,
      metrics: {
        memory: this.getMemoryMetrics(),
        cpu: this.getCpuUsage(),
        activeConnections: 0, // This would be tracked by your connection manager
      },
    };
    
    logger.info('Health check completed', { 
      status: overallStatus,
      services: Object.fromEntries(
        Object.entries(services).map(([key, value]) => [key, value.status])
      ),
    });
    
    return result;
  }
}

// Create health check endpoint
export const createHealthCheckEndpoint = (dbPool: Pool, redis: Redis) => {
  const healthChecker = new HealthChecker(dbPool, redis);
  
  return async (req: Request, res: Response) => {
    try {
      const healthResult = await healthChecker.performHealthCheck();
      
      // Set appropriate HTTP status code
      let statusCode = 200;
      if (healthResult.status === 'degraded') {
        statusCode = 200; // Still operational
      } else if (healthResult.status === 'unhealthy') {
        statusCode = 503; // Service unavailable
      }
      
      res.status(statusCode).json(healthResult);
    } catch (error) {
      logger.error('Health check endpoint failed', { error: error.message });
      
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  };
};

// Readiness probe (for Kubernetes)
export const createReadinessProbe = (dbPool: Pool, redis: Redis) => {
  const healthChecker = new HealthChecker(dbPool, redis);
  
  return async (req: Request, res: Response) => {
    try {
      const [dbHealth, redisHealth] = await Promise.all([
        healthChecker.checkDatabase(),
        healthChecker.checkRedis(),
      ]);
      
      if (dbHealth.status === 'unhealthy' || redisHealth.status === 'unhealthy') {
        return res.status(503).json({ ready: false });
      }
      
      res.status(200).json({ ready: true });
    } catch (error) {
      res.status(503).json({ ready: false });
    }
  };
};

// Liveness probe (for Kubernetes)
export const createLivenessProbe = () => {
  return (req: Request, res: Response) => {
    // Simple liveness check - if the process is running, it's alive
    res.status(200).json({ alive: true });
  };
};