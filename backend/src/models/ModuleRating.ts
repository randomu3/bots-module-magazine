import pool from '../config/database';
import { ModuleRating, CreateModuleRatingInput, UpdateModuleRatingInput } from '../types/database';
import { createModuleRatingSchema, updateModuleRatingSchema } from '../validation/schemas';

export class ModuleRatingModel {
  static async create(input: CreateModuleRatingInput): Promise<ModuleRating> {
    // Validate input
    const { error, value } = createModuleRatingSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const { module_id, user_id, rating, review } = value;

    const query = `
      INSERT INTO module_ratings (module_id, user_id, rating, review)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [module_id, user_id, rating, review];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Module or user not found');
      }
      if (error.code === '23505') { // Unique violation
        throw new Error('User has already rated this module');
      }
      throw error;
    }
  }

  static async findById(id: string): Promise<ModuleRating | null> {
    const query = 'SELECT * FROM module_ratings WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByModuleAndUser(moduleId: string, userId: string): Promise<ModuleRating | null> {
    const query = 'SELECT * FROM module_ratings WHERE module_id = $1 AND user_id = $2';
    const result = await pool.query(query, [moduleId, userId]);
    return result.rows[0] || null;
  }

  static async update(id: string, input: UpdateModuleRatingInput): Promise<ModuleRating | null> {
    // Validate input
    const { error, value } = updateModuleRatingSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const fields = Object.keys(value);
    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE module_ratings 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `;

    const values = [id, ...Object.values(value)];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM module_ratings WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async getModuleRatings(moduleId: string, options: {
    page?: number;
    limit?: number;
    sort?: 'rating' | 'created_at';
    order?: 'asc' | 'desc';
  } = {}): Promise<{ ratings: ModuleRating[]; total: number; stats: { average: number; distribution: Record<number, number> } }> {
    const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = options;
    const offset = (page - 1) * limit;

    // Get ratings with user info
    const ratingsQuery = `
      SELECT 
        mr.*,
        u.first_name,
        u.last_name
      FROM module_ratings mr
      JOIN users u ON mr.user_id = u.id
      WHERE mr.module_id = $1
      ORDER BY ${sort} ${order}
      LIMIT $2 OFFSET $3
    `;

    const ratingsResult = await pool.query(ratingsQuery, [moduleId, limit, offset]);

    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM module_ratings WHERE module_id = $1';
    const countResult = await pool.query(countQuery, [moduleId]);
    const total = parseInt(countResult.rows[0].count);

    // Get rating statistics
    const statsQuery = `
      SELECT 
        AVG(rating)::NUMERIC(3,2) as average,
        COUNT(*) as total_ratings,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5
      FROM module_ratings 
      WHERE module_id = $1
    `;

    const statsResult = await pool.query(statsQuery, [moduleId]);
    const stats = statsResult.rows[0];

    return {
      ratings: ratingsResult.rows,
      total,
      stats: {
        average: parseFloat(stats.average) || 0,
        distribution: {
          1: parseInt(stats.rating_1) || 0,
          2: parseInt(stats.rating_2) || 0,
          3: parseInt(stats.rating_3) || 0,
          4: parseInt(stats.rating_4) || 0,
          5: parseInt(stats.rating_5) || 0
        }
      }
    };
  }

  static async getUserRatings(userId: string, options: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ ratings: ModuleRating[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        mr.*,
        m.name as module_name,
        m.description as module_description
      FROM module_ratings mr
      JOIN modules m ON mr.module_id = m.id
      WHERE mr.user_id = $1
      ORDER BY mr.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);

    const countQuery = 'SELECT COUNT(*) FROM module_ratings WHERE user_id = $1';
    const countResult = await pool.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].count);

    return {
      ratings: result.rows,
      total
    };
  }
}