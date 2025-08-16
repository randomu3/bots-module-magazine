import pool from '../config/database';
import { UserFeedback } from '../types/database';
import { createUserFeedbackSchema, updateUserFeedbackSchema } from '../validation/schemas';

export interface CreateUserFeedbackInput {
  user_id: string;
  type?: string;
  subject: string;
  message: string;
  rating?: number;
}

export interface UpdateUserFeedbackInput {
  status?: string;
  admin_response?: string;
  admin_user_id?: string;
  responded_at?: Date;
}

export class UserFeedbackModel {
  static async create(input: CreateUserFeedbackInput): Promise<UserFeedback> {
    // Validate input
    const { error, value } = createUserFeedbackSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const { user_id, type, subject, message, rating } = value;

    const query = `
      INSERT INTO user_feedback (user_id, type, subject, message, rating)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [user_id, type || 'general', subject, message, rating];

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

  static async findById(id: string): Promise<UserFeedback | null> {
    const query = 'SELECT * FROM user_feedback WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<UserFeedback[]> {
    const query = 'SELECT * FROM user_feedback WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async update(id: string, input: UpdateUserFeedbackInput): Promise<UserFeedback | null> {
    // Validate input
    const { error, value } = updateUserFeedbackSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const fields = Object.keys(value);
    if (fields.length === 0) {
      return this.findById(id);
    }

    // Add responded_at timestamp if admin_response is being set
    if (value.admin_response && !value.responded_at) {
      value.responded_at = new Date();
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE user_feedback 
      SET ${setClause}
      WHERE id = $1 
      RETURNING *
    `;

    const values = [id, ...Object.values(value)];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM user_feedback WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async list(filters: {
    user_id?: string;
    type?: string;
    status?: string;
    rating?: number;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<{ feedback: UserFeedback[]; total: number }> {
    const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = filters;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.user_id) {
      whereConditions.push(`uf.user_id = $${paramIndex++}`);
      values.push(filters.user_id);
    }

    if (filters.type) {
      whereConditions.push(`uf.type = $${paramIndex++}`);
      values.push(filters.type);
    }

    if (filters.status) {
      whereConditions.push(`uf.status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.rating) {
      whereConditions.push(`uf.rating = $${paramIndex++}`);
      values.push(filters.rating);
    }

    if (whereConditions.length > 0) {
      whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*) 
      FROM user_feedback uf
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Data query
    const dataQuery = `
      SELECT 
        uf.*,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        admin_u.email as admin_email,
        admin_u.first_name as admin_first_name,
        admin_u.last_name as admin_last_name
      FROM user_feedback uf
      JOIN users u ON uf.user_id = u.id
      LEFT JOIN users admin_u ON uf.admin_user_id = admin_u.id
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    values.push(limit, offset);
    const dataResult = await pool.query(dataQuery, values);

    return {
      feedback: dataResult.rows,
      total
    };
  }

  static async getFeedbackStats(): Promise<{
    total_feedback: number;
    pending_feedback: number;
    reviewed_feedback: number;
    responded_feedback: number;
    closed_feedback: number;
    average_rating: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_feedback,
        COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed_feedback,
        COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded_feedback,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_feedback,
        ROUND(AVG(rating), 2) as average_rating
      FROM user_feedback
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }

  static async getFeedbackByType(): Promise<Array<{ type: string; count: number; average_rating: number }>> {
    const query = `
      SELECT 
        type,
        COUNT(*) as count,
        ROUND(AVG(rating), 2) as average_rating
      FROM user_feedback
      GROUP BY type
      ORDER BY count DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  }
}