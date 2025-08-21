import { NextApiRequest, NextApiResponse } from 'next';

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    api: 'healthy' | 'unhealthy';
    memory: 'healthy' | 'unhealthy';
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startTime = Date.now();
    
    // Check API connectivity
    let apiStatus: 'healthy' | 'unhealthy' = 'healthy';
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://backend:3001';
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        timeout: 5000,
      });
      
      if (!response.ok) {
        apiStatus = 'unhealthy';
      }
    } catch (error) {
      apiStatus = 'unhealthy';
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryStatus: 'healthy' | 'unhealthy' = 
      memoryUsage.heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'unhealthy'; // 500MB threshold

    const overallStatus: 'healthy' | 'unhealthy' = 
      apiStatus === 'healthy' && memoryStatus === 'healthy' ? 'healthy' : 'unhealthy';

    const healthResponse: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        api: apiStatus,
        memory: memoryStatus,
      },
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthResponse);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        api: 'unhealthy',
        memory: 'unhealthy',
      },
    });
  }
}