import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database';
import { User, CreateUserInput, UpdateUserInput, UserRole } from '../types/database';
import { createUserSchema, updateUserSchema } from '../validation/schemas';

export class UserModel {
  static async create(input: CreateUserInput): Promise<User> {
    // Validate input
    const { error, value } = createUserSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const { email, password, first_name, last_name, role, referral_code, referred_by } = value;

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Generate referral code if not provided
    const finalReferralCode = referral_code || `${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now()}`;

    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, role, referral_code, referred_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [email, password_hash, first_name, last_name, role, finalReferralCode, referred_by];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        if (error.constraint === 'users_email_key') {
          throw new Error('Email already exists');
        }
        if (error.constraint === 'users_referral_code_key') {
          throw new Error('Referral code already exists');
        }
      }
      throw error;
    }
  }

  static async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async findByReferralCode(referralCode: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE referral_code = $1';
    const result = await pool.query(query, [referralCode]);
    return result.rows[0] || null;
  }

  static async update(id: string, input: UpdateUserInput): Promise<User | null> {
    // Validate input
    const { error, value } = updateUserSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const fields = Object.keys(value);
    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE users 
      SET ${setClause}
      WHERE id = $1 
      RETURNING *
    `;

    const values = [id, ...Object.values(value)];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async updateBalance(id: string, amount: number): Promise<User | null> {
    const query = `
      UPDATE users 
      SET balance = balance + $2
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, [id, amount]);
    return result.rows[0] || null;
  }

  static async verifyEmail(id: string): Promise<User | null> {
    const query = `
      UPDATE users 
      SET email_verified = true
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async updatePassword(id: string, newPassword: string): Promise<User | null> {
    const password_hash = await bcrypt.hash(newPassword, 12);
    
    const query = `
      UPDATE users 
      SET password_hash = $2
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, [id, password_hash]);
    return result.rows[0] || null;
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async list(filters: {
    role?: UserRole;
    email_verified?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<{ users: User[]; total: number }> {
    const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = filters;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.role) {
      whereConditions.push(`role = $${paramIndex++}`);
      values.push(filters.role);
    }

    if (filters.email_verified !== undefined) {
      whereConditions.push(`email_verified = $${paramIndex++}`);
      values.push(filters.email_verified);
    }

    if (filters.search) {
      whereConditions.push(`(email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (whereConditions.length > 0) {
      whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Data query
    const dataQuery = `
      SELECT * FROM users 
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    values.push(limit, offset);
    const dataResult = await pool.query(dataQuery, values);

    return {
      users: dataResult.rows,
      total
    };
  }

  static async getReferrals(userId: string): Promise<User[]> {
    const query = 'SELECT * FROM users WHERE referred_by = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async getReferralStats(userId: string): Promise<{
    total_referrals: number;
    active_referrals: number;
    total_commission: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as active_referrals,
        COALESCE(SUM(
          CASE WHEN email_verified = true THEN 
            (SELECT COALESCE(SUM(amount), 0) FROM transactions 
             WHERE user_id = users.id AND type = 'commission' AND status = 'completed')
          ELSE 0 END
        ), 0) as total_commission
      FROM users 
      WHERE referred_by = $1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }
}