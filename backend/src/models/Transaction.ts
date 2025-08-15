import pool from '../config/database';
import { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionType, TransactionStatus } from '../types/database';
import { createTransactionSchema, updateTransactionSchema } from '../validation/schemas';

export class TransactionModel {
  static async create(input: CreateTransactionInput): Promise<Transaction> {
    // Validate input
    const { error, value } = createTransactionSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const { user_id, type, amount, currency, description, metadata } = value;

    const query = `
      INSERT INTO transactions (user_id, type, amount, currency, description, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [user_id, type, amount, currency, description, JSON.stringify(metadata || {})];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('User not found');
      }
      throw error;
    }
  }

  static async findById(id: string): Promise<Transaction | null> {
    const query = 'SELECT * FROM transactions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<Transaction[]> {
    const query = 'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async update(id: string, input: UpdateTransactionInput): Promise<Transaction | null> {
    // Validate input
    const { error, value } = updateTransactionSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const fields = Object.keys(value);
    if (fields.length === 0) {
      return this.findById(id);
    }

    // Handle metadata serialization
    const processedValue = { ...value };
    if (processedValue.metadata) {
      processedValue.metadata = JSON.stringify(processedValue.metadata);
    }

    const setClause = Object.keys(processedValue).map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE transactions 
      SET ${setClause}
      WHERE id = $1 
      RETURNING *
    `;

    const values = [id, ...Object.values(processedValue)];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async updateStatus(id: string, status: TransactionStatus, processedAt?: Date): Promise<Transaction | null> {
    const query = `
      UPDATE transactions 
      SET status = $2, processed_at = $3
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, [id, status, processedAt || new Date()]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM transactions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async list(filters: {
    user_id?: string;
    type?: TransactionType;
    status?: TransactionStatus;
    currency?: string;
    start_date?: Date;
    end_date?: Date;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<{ transactions: Transaction[]; total: number }> {
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

    if (filters.type) {
      whereConditions.push(`type = $${paramIndex++}`);
      values.push(filters.type);
    }

    if (filters.status) {
      whereConditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.currency) {
      whereConditions.push(`currency = $${paramIndex++}`);
      values.push(filters.currency);
    }

    if (filters.start_date) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.start_date);
    }

    if (filters.end_date) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.end_date);
    }

    if (whereConditions.length > 0) {
      whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM transactions ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Data query
    const dataQuery = `
      SELECT 
        t.*,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    values.push(limit, offset);
    const dataResult = await pool.query(dataQuery, values);

    return {
      transactions: dataResult.rows,
      total
    };
  }

  static async getUserBalance(userId: string): Promise<number> {
    const query = `
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN type IN ('commission', 'refund') AND status = 'completed' THEN amount
            WHEN type IN ('payment', 'withdrawal') AND status = 'completed' THEN -amount
            ELSE 0
          END
        ), 0) as balance
      FROM transactions 
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    return parseFloat(result.rows[0].balance) || 0;
  }

  static async getUserTransactionStats(userId: string): Promise<{
    total_earned: number;
    total_spent: number;
    total_withdrawn: number;
    pending_amount: number;
  }> {
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'commission' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN type = 'payment' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_withdrawn,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
      FROM transactions 
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async getRevenueStats(filters: {
    start_date?: Date;
    end_date?: Date;
    type?: TransactionType;
  } = {}): Promise<{
    total_revenue: number;
    completed_transactions: number;
    pending_transactions: number;
    failed_transactions: number;
  }> {
    let whereClause = "WHERE status = 'completed'";
    const whereConditions: string[] = ["status = 'completed'"];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.type) {
      whereConditions.push(`type = $${paramIndex++}`);
      values.push(filters.type);
    }

    if (filters.start_date) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.start_date);
    }

    if (filters.end_date) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.end_date);
    }

    whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_revenue,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions
      FROM transactions 
      ${whereClause.replace("WHERE status = 'completed'", 'WHERE 1=1')}
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getDailyRevenue(days: number = 30): Promise<Array<{
    date: string;
    revenue: number;
    transaction_count: number;
  }>> {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(*) as transaction_count
      FROM transactions 
      WHERE status = 'completed' 
        AND type = 'payment'
        AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  static async getTopSpenders(limit: number = 10): Promise<Array<{
    user_id: string;
    user_email: string;
    user_name: string;
    total_spent: number;
    transaction_count: number;
  }>> {
    const query = `
      SELECT 
        t.user_id,
        u.email as user_email,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        SUM(t.amount) as total_spent,
        COUNT(t.id) as transaction_count
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.type = 'payment' AND t.status = 'completed'
      GROUP BY t.user_id, u.email, u.first_name, u.last_name
      ORDER BY total_spent DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async createPayment(userId: string, amount: number, description: string, metadata: Record<string, any> = {}): Promise<Transaction> {
    return this.create({
      user_id: userId,
      type: 'payment',
      amount,
      description,
      metadata
    });
  }

  static async createCommission(userId: string, amount: number, description: string, metadata: Record<string, any> = {}): Promise<Transaction> {
    return this.create({
      user_id: userId,
      type: 'commission',
      amount,
      description,
      metadata
    });
  }

  static async createWithdrawal(userId: string, amount: number, description: string, metadata: Record<string, any> = {}): Promise<Transaction> {
    return this.create({
      user_id: userId,
      type: 'withdrawal',
      amount,
      description,
      metadata
    });
  }

  static async createRefund(userId: string, amount: number, description: string, metadata: Record<string, any> = {}): Promise<Transaction> {
    return this.create({
      user_id: userId,
      type: 'refund',
      amount,
      description,
      metadata
    });
  }
}