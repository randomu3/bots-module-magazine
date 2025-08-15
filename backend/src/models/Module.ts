import pool from '../config/database';
import { Module, CreateModuleInput, UpdateModuleInput, ModuleStatus } from '../types/database';
import { createModuleSchema, updateModuleSchema } from '../validation/schemas';

export class ModuleModel {
  static async create(input: CreateModuleInput): Promise<Module> {
    // Validate input
    const { error, value } = createModuleSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const {
      name,
      description,
      category,
      price,
      developer_id,
      code_url,
      documentation_url,
      api_endpoints,
      webhook_required
    } = value;

    const query = `
      INSERT INTO modules (
        name, description, category, price, developer_id, 
        code_url, documentation_url, api_endpoints, webhook_required
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      name,
      description,
      category,
      price,
      developer_id,
      code_url,
      documentation_url,
      api_endpoints,
      webhook_required
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Developer not found');
      }
      throw error;
    }
  }

  static async findById(id: string): Promise<Module | null> {
    const query = 'SELECT * FROM modules WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByDeveloperId(developerId: string): Promise<Module[]> {
    const query = 'SELECT * FROM modules WHERE developer_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [developerId]);
    return result.rows;
  }

  static async update(id: string, input: UpdateModuleInput): Promise<Module | null> {
    // Validate input
    const { error, value } = updateModuleSchema.validate(input);
    if (error) {
      throw new Error(`Validation error: ${error.details[0]?.message || 'Invalid input'}`);
    }

    const fields = Object.keys(value);
    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE modules 
      SET ${setClause}
      WHERE id = $1 
      RETURNING *
    `;

    const values = [id, ...Object.values(value)];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async updateStatus(id: string, status: ModuleStatus): Promise<Module | null> {
    const query = `
      UPDATE modules 
      SET status = $2
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, [id, status]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM modules WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async list(filters: {
    category?: string;
    status?: ModuleStatus;
    developer_id?: string;
    price_min?: number;
    price_max?: number;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<{ modules: Module[]; total: number }> {
    const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = filters;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.category) {
      whereConditions.push(`category = $${paramIndex++}`);
      values.push(filters.category);
    }

    if (filters.status) {
      whereConditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.developer_id) {
      whereConditions.push(`developer_id = $${paramIndex++}`);
      values.push(filters.developer_id);
    }

    if (filters.price_min !== undefined) {
      whereConditions.push(`price >= $${paramIndex++}`);
      values.push(filters.price_min);
    }

    if (filters.price_max !== undefined) {
      whereConditions.push(`price <= $${paramIndex++}`);
      values.push(filters.price_max);
    }

    if (filters.search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (whereConditions.length > 0) {
      whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM modules ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Data query
    const dataQuery = `
      SELECT 
        m.*,
        u.first_name as developer_first_name,
        u.last_name as developer_last_name,
        (SELECT COUNT(*) FROM bot_module_activations WHERE module_id = m.id AND status = 'active') as active_installations,
        COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM module_ratings WHERE module_id = m.id), 0) as average_rating,
        COALESCE((SELECT COUNT(*) FROM module_ratings WHERE module_id = m.id), 0) as total_ratings
      FROM modules m
      LEFT JOIN users u ON m.developer_id = u.id
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    values.push(limit, offset);
    const dataResult = await pool.query(dataQuery, values);

    return {
      modules: dataResult.rows,
      total
    };
  }

  static async getApprovedModules(filters: {
    category?: string;
    price_min?: number;
    price_max?: number;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<{ modules: Module[]; total: number }> {
    return this.list({ ...filters, status: 'approved' });
  }

  static async getModuleStats(moduleId: string): Promise<{
    total_installations: number;
    active_installations: number;
    total_revenue: number;
    monthly_revenue: number;
    average_rating: number;
    total_ratings: number;
  }> {
    const query = `
      SELECT 
        COUNT(bma.id) as total_installations,
        COUNT(CASE WHEN bma.status = 'active' THEN 1 END) as active_installations,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(amount), 0) FROM transactions 
           WHERE type = 'payment' AND status = 'completed'
           AND metadata->>'module_id' = m.id::text)
        ), 0) as total_revenue,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(amount), 0) FROM transactions 
           WHERE type = 'payment' AND status = 'completed'
           AND metadata->>'module_id' = m.id::text
           AND created_at >= date_trunc('month', CURRENT_DATE))
        ), 0) as monthly_revenue,
        COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM module_ratings WHERE module_id = m.id), 0) as average_rating,
        COALESCE((SELECT COUNT(*) FROM module_ratings WHERE module_id = m.id), 0) as total_ratings
      FROM modules m
      LEFT JOIN bot_module_activations bma ON m.id = bma.module_id
      WHERE m.id = $1
      GROUP BY m.id
    `;

    const result = await pool.query(query, [moduleId]);
    const row = result.rows[0];
    
    if (!row) {
      return {
        total_installations: 0,
        active_installations: 0,
        total_revenue: 0,
        monthly_revenue: 0,
        average_rating: 0,
        total_ratings: 0
      };
    }

    return {
      total_installations: parseInt(row.total_installations) || 0,
      active_installations: parseInt(row.active_installations) || 0,
      total_revenue: parseFloat(row.total_revenue) || 0,
      monthly_revenue: parseFloat(row.monthly_revenue) || 0,
      average_rating: parseFloat(row.average_rating) || 0,
      total_ratings: parseInt(row.total_ratings) || 0
    };
  }

  static async getCategories(): Promise<string[]> {
    const query = `
      SELECT DISTINCT category 
      FROM modules 
      WHERE category IS NOT NULL AND status = 'approved'
      ORDER BY category
    `;

    const result = await pool.query(query);
    return result.rows.map(row => row.category);
  }

  static async getPopularModules(limit: number = 10): Promise<Module[]> {
    const query = `
      SELECT 
        m.*,
        COUNT(bma.id) as installation_count,
        COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM module_ratings WHERE module_id = m.id), 0) as average_rating,
        COALESCE((SELECT COUNT(*) FROM module_ratings WHERE module_id = m.id), 0) as total_ratings
      FROM modules m
      LEFT JOIN bot_module_activations bma ON m.id = bma.module_id AND bma.status = 'active'
      WHERE m.status = 'approved'
      GROUP BY m.id
      ORDER BY installation_count DESC, m.created_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async getFeaturedModules(limit: number = 5): Promise<Module[]> {
    // For now, return newest approved modules
    // In the future, this could be based on admin selection or other criteria
    const query = `
      SELECT 
        m.*,
        COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM module_ratings WHERE module_id = m.id), 0) as average_rating,
        COALESCE((SELECT COUNT(*) FROM module_ratings WHERE module_id = m.id), 0) as total_ratings
      FROM modules m
      WHERE m.status = 'approved'
      ORDER BY m.created_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async searchModules(searchTerm: string, limit: number = 20): Promise<Module[]> {
    const query = `
      SELECT 
        m.*,
        COUNT(bma.id) as installation_count,
        COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM module_ratings WHERE module_id = m.id), 0) as average_rating,
        COALESCE((SELECT COUNT(*) FROM module_ratings WHERE module_id = m.id), 0) as total_ratings,
        ts_rank(
          to_tsvector('english', m.name || ' ' || COALESCE(m.description, '')),
          plainto_tsquery('english', $1)
        ) as rank
      FROM modules m
      LEFT JOIN bot_module_activations bma ON m.id = bma.module_id AND bma.status = 'active'
      WHERE m.status = 'approved'
        AND (
          to_tsvector('english', m.name || ' ' || COALESCE(m.description, '')) 
          @@ plainto_tsquery('english', $1)
          OR m.name ILIKE $2
          OR m.description ILIKE $2
        )
      GROUP BY m.id
      ORDER BY rank DESC, installation_count DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [searchTerm, `%${searchTerm}%`, limit]);
    return result.rows;
  }
}