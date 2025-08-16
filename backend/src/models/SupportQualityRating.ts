import pool from '../config/database';
import { SupportQualityRating } from '../types/database';
import { createSupportQualityRatingSchema } from '../validation/schemas';

export interface CreateSupportQualityRatingInput {
  ticket_id: string;
  user_id: string;
  rating: number;
  feedback_text?: string;
}

export class SupportQualityRatingModel {
  static async create(input: CreateSupportQualityRatingInput): Promise<SupportQualityRating> {
    // Validate input
    const { error, value } = createSupportQualityRatingSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const { ticket_id, user_id, rating, feedback_text } = value;

    // Check if rating already exists for this ticket and user
    const existingQuery = 'SELECT id FROM support_quality_ratings WHERE ticket_id = $1 AND user_id = $2';
    const existingResult = await pool.query(existingQuery, [ticket_id, user_id]);
    
    if (existingResult.rows.length > 0) {
      throw new Error('Rating already exists for this ticket');
    }

    const query = `
      INSERT INTO support_quality_ratings (ticket_id, user_id, rating, feedback_text)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [ticket_id, user_id, rating, feedback_text];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Ticket or user not found');
      }
      throw error;
    }
  }

  static async findById(id: string): Promise<SupportQualityRating | null> {
    const query = 'SELECT * FROM support_quality_ratings WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByTicketId(ticketId: string): Promise<SupportQualityRating | null> {
    const query = 'SELECT * FROM support_quality_ratings WHERE ticket_id = $1';
    const result = await pool.query(query, [ticketId]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<SupportQualityRating[]> {
    const query = 'SELECT * FROM support_quality_ratings WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM support_quality_ratings WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async list(filters: {
    ticket_id?: string;
    user_id?: string;
    rating?: number;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<{ ratings: SupportQualityRating[]; total: number }> {
    const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = filters;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.ticket_id) {
      whereConditions.push(`sqr.ticket_id = $${paramIndex++}`);
      values.push(filters.ticket_id);
    }

    if (filters.user_id) {
      whereConditions.push(`sqr.user_id = $${paramIndex++}`);
      values.push(filters.user_id);
    }

    if (filters.rating) {
      whereConditions.push(`sqr.rating = $${paramIndex++}`);
      values.push(filters.rating);
    }

    if (whereConditions.length > 0) {
      whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*) 
      FROM support_quality_ratings sqr
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Data query
    const dataQuery = `
      SELECT 
        sqr.*,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        st.subject as ticket_subject
      FROM support_quality_ratings sqr
      JOIN users u ON sqr.user_id = u.id
      JOIN support_tickets st ON sqr.ticket_id = st.id
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    values.push(limit, offset);
    const dataResult = await pool.query(dataQuery, values);

    return {
      ratings: dataResult.rows,
      total
    };
  }

  static async getSupportQualityStats(): Promise<{
    total_ratings: number;
    average_rating: number;
    rating_distribution: Array<{ rating: number; count: number }>;
  }> {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_ratings,
        ROUND(AVG(rating), 2) as average_rating
      FROM support_quality_ratings
    `;

    const distributionQuery = `
      SELECT 
        rating,
        COUNT(*) as count
      FROM support_quality_ratings
      GROUP BY rating
      ORDER BY rating
    `;

    const [statsResult, distributionResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(distributionQuery)
    ]);

    return {
      total_ratings: parseInt(statsResult.rows[0].total_ratings),
      average_rating: parseFloat(statsResult.rows[0].average_rating) || 0,
      rating_distribution: distributionResult.rows
    };
  }
}