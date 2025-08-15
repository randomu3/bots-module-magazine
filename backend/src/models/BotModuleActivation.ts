import crypto from 'crypto';
import pool from '../config/database';
import { BotModuleActivation, ActivateModuleInput, BotStatus } from '../types/database';
import { activateModuleSchema, updateModuleActivationSchema } from '../validation/schemas';

export class BotModuleActivationModel {
  private static generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async create(input: ActivateModuleInput): Promise<BotModuleActivation> {
    // Validate input
    const { error, value } = activateModuleSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const { bot_id, module_id, markup_percentage, settings, expires_at } = value;

    // Generate unique API key
    const api_key = this.generateApiKey();

    const query = `
      INSERT INTO bot_module_activations (
        bot_id, module_id, markup_percentage, api_key, settings, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      bot_id,
      module_id,
      markup_percentage,
      api_key,
      JSON.stringify(settings || {}),
      expires_at
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        if (error.constraint === 'bot_module_activations_bot_id_module_id_key') {
          throw new Error('Module is already activated for this bot');
        }
        if (error.constraint === 'bot_module_activations_api_key_key') {
          // Retry with new API key
          return this.create(input);
        }
      }
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Bot or module not found');
      }
      throw error;
    }
  }

  static async findById(id: string): Promise<BotModuleActivation | null> {
    const query = 'SELECT * FROM bot_module_activations WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByBotAndModule(botId: string, moduleId: string): Promise<BotModuleActivation | null> {
    const query = 'SELECT * FROM bot_module_activations WHERE bot_id = $1 AND module_id = $2';
    const result = await pool.query(query, [botId, moduleId]);
    return result.rows[0] || null;
  }

  static async findByApiKey(apiKey: string): Promise<BotModuleActivation | null> {
    const query = `
      SELECT 
        bma.*,
        b.name as bot_name,
        b.telegram_bot_id,
        m.name as module_name,
        m.category as module_category
      FROM bot_module_activations bma
      JOIN bots b ON bma.bot_id = b.id
      JOIN modules m ON bma.module_id = m.id
      WHERE bma.api_key = $1 AND bma.status = 'active'
    `;
    
    const result = await pool.query(query, [apiKey]);
    return result.rows[0] || null;
  }

  static async findByBotId(botId: string): Promise<BotModuleActivation[]> {
    const query = `
      SELECT 
        bma.*,
        m.name as module_name,
        m.description as module_description,
        m.category as module_category,
        m.price as module_price
      FROM bot_module_activations bma
      JOIN modules m ON bma.module_id = m.id
      WHERE bma.bot_id = $1
      ORDER BY bma.activated_at DESC
    `;
    
    const result = await pool.query(query, [botId]);
    return result.rows;
  }

  static async findByModuleId(moduleId: string): Promise<BotModuleActivation[]> {
    const query = `
      SELECT 
        bma.*,
        b.name as bot_name,
        b.telegram_bot_id,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name
      FROM bot_module_activations bma
      JOIN bots b ON bma.bot_id = b.id
      JOIN users u ON b.user_id = u.id
      WHERE bma.module_id = $1
      ORDER BY bma.activated_at DESC
    `;
    
    const result = await pool.query(query, [moduleId]);
    return result.rows;
  }

  static async update(id: string, input: {
    markup_percentage?: number;
    status?: BotStatus;
    settings?: Record<string, any>;
    expires_at?: Date;
  }): Promise<BotModuleActivation | null> {
    // Validate input
    const { error, value } = updateModuleActivationSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const fields = Object.keys(value);
    if (fields.length === 0) {
      return this.findById(id);
    }

    // Handle settings serialization
    const processedValue = { ...value };
    if (processedValue.settings) {
      processedValue.settings = JSON.stringify(processedValue.settings);
    }

    const setClause = Object.keys(processedValue).map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE bot_module_activations 
      SET ${setClause}
      WHERE id = $1 
      RETURNING *
    `;

    const values = [id, ...Object.values(processedValue)];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async updateStatus(id: string, status: BotStatus): Promise<BotModuleActivation | null> {
    const query = `
      UPDATE bot_module_activations 
      SET status = $2
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, [id, status]);
    return result.rows[0] || null;
  }

  static async deactivate(id: string): Promise<BotModuleActivation | null> {
    return this.updateStatus(id, 'inactive');
  }

  static async activate(id: string): Promise<BotModuleActivation | null> {
    return this.updateStatus(id, 'active');
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM bot_module_activations WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async regenerateApiKey(id: string): Promise<BotModuleActivation | null> {
    const newApiKey = this.generateApiKey();
    
    const query = `
      UPDATE bot_module_activations 
      SET api_key = $2
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, [id, newApiKey]);
    return result.rows[0] || null;
  }

  static async list(filters: {
    bot_id?: string;
    module_id?: string;
    status?: BotStatus;
    user_id?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<{ activations: BotModuleActivation[]; total: number }> {
    const { page = 1, limit = 20, sort = 'activated_at', order = 'desc' } = filters;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.bot_id) {
      whereConditions.push(`bma.bot_id = $${paramIndex++}`);
      values.push(filters.bot_id);
    }

    if (filters.module_id) {
      whereConditions.push(`bma.module_id = $${paramIndex++}`);
      values.push(filters.module_id);
    }

    if (filters.status) {
      whereConditions.push(`bma.status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.user_id) {
      whereConditions.push(`b.user_id = $${paramIndex++}`);
      values.push(filters.user_id);
    }

    if (whereConditions.length > 0) {
      whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*) 
      FROM bot_module_activations bma
      JOIN bots b ON bma.bot_id = b.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Data query
    const dataQuery = `
      SELECT 
        bma.*,
        b.name as bot_name,
        b.telegram_bot_id,
        m.name as module_name,
        m.description as module_description,
        m.category as module_category,
        m.price as module_price,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name
      FROM bot_module_activations bma
      JOIN bots b ON bma.bot_id = b.id
      JOIN modules m ON bma.module_id = m.id
      JOIN users u ON b.user_id = u.id
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    values.push(limit, offset);
    const dataResult = await pool.query(dataQuery, values);

    return {
      activations: dataResult.rows,
      total
    };
  }

  static async getActiveActivations(botId?: string): Promise<BotModuleActivation[]> {
    let query = `
      SELECT 
        bma.*,
        b.name as bot_name,
        b.telegram_bot_id,
        m.name as module_name,
        m.description as module_description,
        m.category as module_category
      FROM bot_module_activations bma
      JOIN bots b ON bma.bot_id = b.id
      JOIN modules m ON bma.module_id = m.id
      WHERE bma.status = 'active'
        AND (bma.expires_at IS NULL OR bma.expires_at > CURRENT_TIMESTAMP)
    `;

    const values: any[] = [];
    
    if (botId) {
      query += ' AND bma.bot_id = $1';
      values.push(botId);
    }

    query += ' ORDER BY bma.activated_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async getExpiredActivations(): Promise<BotModuleActivation[]> {
    const query = `
      SELECT * FROM bot_module_activations 
      WHERE status = 'active' 
        AND expires_at IS NOT NULL 
        AND expires_at <= CURRENT_TIMESTAMP
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  static async deactivateExpired(): Promise<number> {
    const query = `
      UPDATE bot_module_activations 
      SET status = 'inactive'
      WHERE status = 'active' 
        AND expires_at IS NOT NULL 
        AND expires_at <= CURRENT_TIMESTAMP
    `;

    const result = await pool.query(query);
    return result.rowCount || 0;
  }

  static async getActivationStats(filters: {
    bot_id?: string;
    module_id?: string;
    user_id?: string;
  } = {}): Promise<{
    total_activations: number;
    active_activations: number;
    inactive_activations: number;
    expired_activations: number;
  }> {
    let whereClause = '';
    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.bot_id) {
      whereConditions.push(`bma.bot_id = $${paramIndex++}`);
      values.push(filters.bot_id);
    }

    if (filters.module_id) {
      whereConditions.push(`bma.module_id = $${paramIndex++}`);
      values.push(filters.module_id);
    }

    if (filters.user_id) {
      whereConditions.push(`b.user_id = $${paramIndex++}`);
      values.push(filters.user_id);
    }

    if (whereConditions.length > 0) {
      whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    }

    const query = `
      SELECT 
        COUNT(*) as total_activations,
        COUNT(CASE WHEN bma.status = 'active' AND (bma.expires_at IS NULL OR bma.expires_at > CURRENT_TIMESTAMP) THEN 1 END) as active_activations,
        COUNT(CASE WHEN bma.status = 'inactive' THEN 1 END) as inactive_activations,
        COUNT(CASE WHEN bma.status = 'active' AND bma.expires_at IS NOT NULL AND bma.expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_activations
      FROM bot_module_activations bma
      JOIN bots b ON bma.bot_id = b.id
      ${whereClause}
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}