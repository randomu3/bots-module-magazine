import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redis = createClient({
  url: process.env['REDIS_URL'] || 'redis://localhost:6379'
});

// Redis connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connection established');
});

redis.on('error', (err: Error) => {
  console.error('❌ Redis connection error:', err.message);
});

redis.on('ready', () => {
  console.log('✅ Redis is ready to accept commands');
});

redis.on('close', () => {
  console.log('⚠️ Redis connection closed');
});

// Test Redis connection
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    await redis.ping();
    console.log('✅ Redis connection successful');
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    return false;
  }
};

export default redis;