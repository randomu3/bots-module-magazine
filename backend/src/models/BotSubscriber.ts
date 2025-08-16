import pool from '../config/database';

export interface BotSubscriber {
  id: string;
  bot_id: string;
  chat_id: string;
  chat_type: 'private' | 'group' | 'supergroup' | 'channel';
  user_id?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  subscribed_at: Date;
  last_interaction: Date;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBotSubscriberInput {
  bot_id: string;
  chat_id: string;
  chat_type: 'private' | 'group' | 'supergroup' | 'channel';
  user_id?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  metadata?: Record<string, any>;
}

export interface UpdateBotSubscriberInput {
  username?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  last_interaction?: Date;
  metadata?: Record<string, any>;
}

export class BotSubscriberModel {
  static async create(input: CreateBotSubscriberInput): Promise<BotSubscriber> {
    const { 
      bot_id, 
      chat_id, 
      chat_type, 
      user_id, 
      username, 
      first_name, 
      last_name, 
      metadata = {} 
    } = input;

    const query = `
      INSERT INTO bot_subscribers (
        bot_id, chat_id, chat_type, user_id, username, 
        first_name, last_name, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (bot_id, chat_id) 
      DO UPDATE SET 
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        is_active = true,
        last_interaction = CURRENT_TIMESTAMP,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      bot_id, 
      chat_id, 
      chat_type, 
      user_id, 
      username, 
      first_name, 
      last_name, 
      JSON.stringify(metadata)
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: string): Promise<BotSubscriber | null> {
    const query = 'SELECT * FROM bot_subscribers WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByBotAndChat(botId: string, chatId: string): Promise<BotSubscriber | null> {
    const query = 'SELECT * FROM bot_subscribers WHERE bot_id = $1 AND chat_id = $2';
    const result = await pool.query(query, [botId, chatId]);
    return result.rows[0] || null;
  }

  static async findByBotId(
    botId: string,
    options: {
      is_active?: boolean;
      chat_type?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<BotSubscriber[]> {
    const { is_active, chat_type, limit = 100, offset = 0 } = options;
    
    let query = 'SELECT * FROM bot_subscribers WHERE bot_id = $1';
    const values: any[] = [botId];
    let paramIndex = 2;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      values.push(is_active);
    }

    if (chat_type) {
      query += ` AND chat_type = $${paramIndex++}`;
      values.push(chat_type);
    }

    query += ` ORDER BY subscribed_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async update(id: string, input: UpdateBotSubscriberInput): Promise<BotSubscriber | null> {
    const fields = Object.keys(input);
    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClause = fields.map((field, index) => {
      if (field === 'metadata') {
        return `${field} = $${index + 2}`;
      }
      return `${field} = $${index + 2}`;
    }).join(', ');

    const values = [id, ...Object.values(input).map(value => 
      typeof value === 'object' ? JSON.stringify(value) : value
    )];

    const query = `
      UPDATE bot_subscribers 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async updateLastInteraction(botId: string, chatId: string): Promise<void> {
    const query = `
      UPDATE bot_subscribers 
      SET last_interaction = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE bot_id = $1 AND chat_id = $2
    `;

    await pool.query(query, [botId, chatId]);
  }

  static async deactivate(id: string): Promise<BotSubscriber | null> {
    const query = `
      UPDATE bot_subscribers 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async deactivateByBotAndChat(botId: string, chatId: string): Promise<void> {
    const query = `
      UPDATE bot_subscribers 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE bot_id = $1 AND chat_id = $2
    `;

    await pool.query(query, [botId, chatId]);
  }

  static async getSubscriberCount(botId: string, isActive: boolean = true): Promise<number> {
    const query = `
      SELECT COUNT(*) 
      FROM bot_subscribers 
      WHERE bot_id = $1 AND is_active = $2
    `;

    const result = await pool.query(query, [botId, isActive]);
    return parseInt(result.rows[0].count);
  }

  static async getSubscriberStats(botId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    by_chat_type: Record<string, number>;
    recent_subscribers: number; // last 7 days
  }> {
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive,
        COUNT(CASE WHEN subscribed_at >= CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as recent_subscribers
      FROM bot_subscribers 
      WHERE bot_id = $1
    `;

    const chatTypeQuery = `
      SELECT chat_type, COUNT(*) as count
      FROM bot_subscribers 
      WHERE bot_id = $1 AND is_active = true
      GROUP BY chat_type
    `;

    const [statsResult, chatTypeResult] = await Promise.all([
      pool.query(statsQuery, [botId]),
      pool.query(chatTypeQuery, [botId])
    ]);

    const stats = statsResult.rows[0];
    const byChatType: Record<string, number> = {};
    
    chatTypeResult.rows.forEach(row => {
      byChatType[row.chat_type] = parseInt(row.count);
    });

    return {
      total: parseInt(stats.total),
      active: parseInt(stats.active),
      inactive: parseInt(stats.inactive),
      by_chat_type: byChatType,
      recent_subscribers: parseInt(stats.recent_subscribers)
    };
  }

  static async getActiveChatIds(botId: string): Promise<string[]> {
    const query = `
      SELECT chat_id 
      FROM bot_subscribers 
      WHERE bot_id = $1 AND is_active = true
      ORDER BY last_interaction DESC
    `;

    const result = await pool.query(query, [botId]);
    return result.rows.map(row => row.chat_id);
  }

  static async searchSubscribers(
    botId: string,
    searchTerm: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<BotSubscriber[]> {
    const { limit = 50, offset = 0 } = options;
    
    const query = `
      SELECT * FROM bot_subscribers 
      WHERE bot_id = $1 
      AND (
        username ILIKE $2 OR 
        first_name ILIKE $2 OR 
        last_name ILIKE $2 OR
        chat_id = $3
      )
      ORDER BY last_interaction DESC
      LIMIT $4 OFFSET $5
    `;

    const searchPattern = `%${searchTerm}%`;
    const result = await pool.query(query, [
      botId, 
      searchPattern, 
      searchTerm, // exact chat_id match
      limit, 
      offset
    ]);

    return result.rows;
  }

  static async bulkDeactivate(botId: string, chatIds: string[]): Promise<number> {
    if (chatIds.length === 0) return 0;

    const placeholders = chatIds.map((_, index) => `$${index + 2}`).join(',');
    const query = `
      UPDATE bot_subscribers 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE bot_id = $1 AND chat_id IN (${placeholders})
    `;

    const result = await pool.query(query, [botId, ...chatIds]);
    return result.rowCount || 0;
  }

  static async cleanupInactiveSubscribers(daysInactive: number = 90): Promise<number> {
    const query = `
      DELETE FROM bot_subscribers 
      WHERE is_active = false 
      AND updated_at < CURRENT_TIMESTAMP - INTERVAL '${daysInactive} days'
    `;

    const result = await pool.query(query);
    return result.rowCount || 0;
  }
}