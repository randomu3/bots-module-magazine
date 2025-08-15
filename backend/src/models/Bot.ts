import crypto from 'crypto';
import pool from '../config/database';
import { Bot, CreateBotInput, UpdateBotInput, BotStatus } from '../types/database';
import { createBotSchema, updateBotSchema } from '../validation/schemas';

export class BotModel {
  private static encryptToken(token: string): string {
    const algorithm = 'aes-256-gcm';
    const secretKey = process.env['BOT_TOKEN_SECRET'] || 'default-secret-key-change-in-production';
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private static decryptToken(encryptedToken: string): string {
    const algorithm = 'aes-256-gcm';
    const secretKey = process.env['BOT_TOKEN_SECRET'] || 'default-secret-key-change-in-production';
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    
    const [ivHex, encrypted] = encryptedToken.split(':');
    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted token format');
    }
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  static async create(input: CreateBotInput): Promise<Bot> {
    // Validate input
    const { error, value } = createBotSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const { user_id, telegram_bot_id, name, username, description, token, webhook_url } = value;

    // Encrypt the bot token
    const token_hash = this.encryptToken(token);

    const query = `
      INSERT INTO bots (user_id, telegram_bot_id, name, username, description, token_hash, webhook_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [user_id, telegram_bot_id, name, username, description, token_hash, webhook_url];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        if (error.constraint === 'bots_telegram_bot_id_key') {
          throw new Error('Bot with this Telegram ID already exists');
        }
      }
      if (error.code === '23503') { // Foreign key violation
        throw new Error('User not found');
      }
      throw error;
    }
  }

  static async findById(id: string): Promise<Bot | null> {
    const query = 'SELECT * FROM bots WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByTelegramId(telegramBotId: string): Promise<Bot | null> {
    const query = 'SELECT * FROM bots WHERE telegram_bot_id = $1';
    const result = await pool.query(query, [telegramBotId]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<Bot[]> {
    const query = 'SELECT * FROM bots WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async update(id: string, input: UpdateBotInput): Promise<Bot | null> {
    // Validate input
    const { error, value } = updateBotSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const fields = Object.keys(value);
    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE bots 
      SET ${setClause}
      WHERE id = $1 
      RETURNING *
    `;

    const values = [id, ...Object.values(value)];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async updateStatus(id: string, status: BotStatus): Promise<Bot | null> {
    const query = `
      UPDATE bots 
      SET status = $2
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, [id, status]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM bots WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async getDecryptedToken(id: string): Promise<string | null> {
    const query = 'SELECT token_hash FROM bots WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.decryptToken(result.rows[0].token_hash);
  }

  static async list(filters: {
    user_id?: string;
    status?: BotStatus;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<{ bots: Bot[]; total: number }> {
    const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = filters;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.user_id) {
      whereConditions.push(`user_id = $${paramIndex++}`);
      values.push(filters.user_id);
    }

    if (filters.status) {
      whereConditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR username ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (whereConditions.length > 0) {
      whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM bots ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Data query
    const dataQuery = `
      SELECT * FROM bots 
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    values.push(limit, offset);
    const dataResult = await pool.query(dataQuery, values);

    return {
      bots: dataResult.rows,
      total
    };
  }

  static async getBotStats(botId: string): Promise<{
    total_modules: number;
    active_modules: number;
    total_revenue: number;
    monthly_revenue: number;
  }> {
    const query = `
      SELECT 
        COUNT(bma.id) as total_modules,
        COUNT(CASE WHEN bma.status = 'active' THEN 1 END) as active_modules,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(amount), 0) FROM transactions 
           WHERE user_id = b.user_id AND type = 'commission' AND status = 'completed'
           AND metadata->>'bot_id' = b.id::text)
        ), 0) as total_revenue,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(amount), 0) FROM transactions 
           WHERE user_id = b.user_id AND type = 'commission' AND status = 'completed'
           AND metadata->>'bot_id' = b.id::text
           AND created_at >= date_trunc('month', CURRENT_DATE))
        ), 0) as monthly_revenue
      FROM bots b
      LEFT JOIN bot_module_activations bma ON b.id = bma.bot_id
      WHERE b.id = $1
      GROUP BY b.id, b.user_id
    `;

    const result = await pool.query(query, [botId]);
    return result.rows[0] || {
      total_modules: 0,
      active_modules: 0,
      total_revenue: 0,
      monthly_revenue: 0
    };
  }

  static async getActiveModules(botId: string): Promise<any[]> {
    const query = `
      SELECT 
        bma.*,
        m.name as module_name,
        m.description as module_description,
        m.category as module_category
      FROM bot_module_activations bma
      JOIN modules m ON bma.module_id = m.id
      WHERE bma.bot_id = $1 AND bma.status = 'active'
      ORDER BY bma.activated_at DESC
    `;

    const result = await pool.query(query, [botId]);
    return result.rows;
  }
}