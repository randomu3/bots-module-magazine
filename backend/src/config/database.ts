import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env['DATABASE_URL'] || `postgresql://${process.env['POSTGRES_USER'] || 'postgres'}:${process.env['POSTGRES_PASSWORD'] || 'password'}@${process.env['POSTGRES_HOST'] || 'localhost'}:${process.env['POSTGRES_PORT'] || 5432}/${process.env['POSTGRES_DB'] || 'telegram_bot_platform'}`,
  ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};