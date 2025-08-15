import pool from '../config/database';
import { SupportTicket } from '../types/database';
import { createSupportTicketSchema, updateSupportTicketSchema } from '../validation/schemas';

export interface CreateSupportTicketInput {
  user_id: string;
  subject: string;
  message: string;
  priority?: string;
}

export interface UpdateSupportTicketInput {
  status?: string;
  priority?: string;
}

export class SupportTicketModel {
  static async create(input: CreateSupportTicketInput): Promise<SupportTicket> {
    // Validate input
    const { error, value } = createSupportTicketSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const { user_id, subject, message, priority } = value;

    const query = `
      INSERT INTO support_tickets (user_id, subject, message, priority)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [user_id, subject, message, priority || 'normal'];

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

  static async findById(id: string): Promise<SupportTicket | null> {
    const query = 'SELECT * FROM support_tickets WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<SupportTicket[]> {
    const query = 'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async update(id: string, input: UpdateSupportTicketInput): Promise<SupportTicket | null> {
    // Validate input
    const { error, value } = updateSupportTicketSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const fields = Object.keys(value);
    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE support_tickets 
      SET ${setClause}
      WHERE id = $1 
      RETURNING *
    `;

    const values = [id, ...Object.values(value)];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async updateStatus(id: string, status: string): Promise<SupportTicket | null> {
    const query = `
      UPDATE support_tickets 
      SET status = $2
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, [id, status]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM support_tickets WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async list(filters: {
    user_id?: string;
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<{ tickets: SupportTicket[]; total: number }> {
    const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = filters;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.user_id) {
      whereConditions.push(`st.user_id = $${paramIndex++}`);
      values.push(filters.user_id);
    }

    if (filters.status) {
      whereConditions.push(`st.status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.priority) {
      whereConditions.push(`st.priority = $${paramIndex++}`);
      values.push(filters.priority);
    }

    if (whereConditions.length > 0) {
      whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*) 
      FROM support_tickets st
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Data query
    const dataQuery = `
      SELECT 
        st.*,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    values.push(limit, offset);
    const dataResult = await pool.query(dataQuery, values);

    return {
      tickets: dataResult.rows,
      total
    };
  }

  static async getTicketStats(): Promise<{
    total_tickets: number;
    open_tickets: number;
    in_progress_tickets: number;
    resolved_tickets: number;
    closed_tickets: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets
      FROM support_tickets
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }
}