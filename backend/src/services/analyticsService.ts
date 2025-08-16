import pool from '../config/database';


export interface RevenueStats {
  total_revenue: number;
  monthly_revenue: number;
  daily_revenue: number;
  revenue_growth: number;
}

export interface BotAnalytics {
  bot_id: string;
  bot_name: string;
  total_revenue: number;
  monthly_revenue: number;
  active_modules: number;
  total_users: number;
  conversion_rate: number;
}

export interface ModuleAnalytics {
  module_id: string;
  module_name: string;
  category: string;
  total_activations: number;
  active_activations: number;
  total_revenue: number;
  average_markup: number;
}

export interface PeriodStats {
  date: string;
  revenue: number;
  transactions: number;
  new_activations: number;
  active_users: number;
}

export class AnalyticsService {
  // Get revenue statistics for a user's bots
  static async getUserRevenueStats(userId: string, period?: string): Promise<RevenueStats> {
    const periodCondition = this.getPeriodCondition(period);
    
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN t.status = 'completed' AND t.created_at >= date_trunc('month', CURRENT_DATE) THEN t.amount ELSE 0 END), 0) as monthly_revenue,
        COALESCE(SUM(CASE WHEN t.status = 'completed' AND t.created_at >= CURRENT_DATE THEN t.amount ELSE 0 END), 0) as daily_revenue
      FROM transactions t
      WHERE t.user_id = $1 
        AND t.type = 'commission'
        ${periodCondition}
    `;

    const result = await pool.query(query, [userId]);
    const stats = result.rows[0];

    // Calculate growth rate (comparing current month to previous month)
    const growthQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN t.created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
                          AND t.created_at < date_trunc('month', CURRENT_DATE) 
                          AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as previous_month_revenue
      FROM transactions t
      WHERE t.user_id = $1 AND t.type = 'commission'
    `;

    const growthResult = await pool.query(growthQuery, [userId]);
    const previousMonthRevenue = parseFloat(growthResult.rows[0].previous_month_revenue);
    
    const revenue_growth = previousMonthRevenue > 0 
      ? ((stats.monthly_revenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : 0;

    return {
      total_revenue: parseFloat(stats.total_revenue),
      monthly_revenue: parseFloat(stats.monthly_revenue),
      daily_revenue: parseFloat(stats.daily_revenue),
      revenue_growth
    };
  } 
 // Get analytics for user's bots
  static async getUserBotAnalytics(userId: string, botId?: string): Promise<BotAnalytics[]> {
    let botCondition = '';
    const params = [userId];
    
    if (botId) {
      botCondition = 'AND b.id = $2';
      params.push(botId);
    }

    const query = `
      SELECT 
        b.id as bot_id,
        b.name as bot_name,
        COALESCE(SUM(
          CASE WHEN t.status = 'completed' AND t.type = 'commission' 
          THEN t.amount ELSE 0 END
        ), 0) as total_revenue,
        COALESCE(SUM(
          CASE WHEN t.status = 'completed' AND t.type = 'commission' 
               AND t.created_at >= date_trunc('month', CURRENT_DATE)
          THEN t.amount ELSE 0 END
        ), 0) as monthly_revenue,
        COUNT(DISTINCT CASE WHEN bma.status = 'active' THEN bma.id END) as active_modules,
        COALESCE(
          (SELECT COUNT(DISTINCT metadata->>'user_id') 
           FROM transactions 
           WHERE user_id = b.user_id 
             AND metadata->>'bot_id' = b.id::text
             AND status = 'completed'), 0
        ) as total_users
      FROM bots b
      LEFT JOIN bot_module_activations bma ON b.id = bma.bot_id
      LEFT JOIN transactions t ON t.user_id = b.user_id 
        AND t.metadata->>'bot_id' = b.id::text
      WHERE b.user_id = $1 ${botCondition}
      GROUP BY b.id, b.name, b.user_id
      ORDER BY total_revenue DESC
    `;

    const result = await pool.query(query, params);
    
    return result.rows.map(row => ({
      bot_id: row.bot_id,
      bot_name: row.bot_name,
      total_revenue: parseFloat(row.total_revenue),
      monthly_revenue: parseFloat(row.monthly_revenue),
      active_modules: parseInt(row.active_modules),
      total_users: parseInt(row.total_users),
      conversion_rate: row.total_users > 0 ? (parseFloat(row.total_revenue) / parseInt(row.total_users)) : 0
    }));
  }

  // Get period-based statistics for charts
  static async getPeriodStats(userId: string, period: string = '30d', botId?: string): Promise<PeriodStats[]> {
    const { interval, dateFormat, limit } = this.getPeriodConfig(period);
    
    let botCondition = '';
    const params = [userId];
    
    if (botId) {
      botCondition = 'AND t.metadata->\'bot_id\' = $2';
      params.push(botId);
    }

    const query = `
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${limit} ${interval}',
          CURRENT_DATE,
          INTERVAL '1 ${interval}'
        )::date as date
      ),
      stats AS (
        SELECT 
          ${dateFormat} as period,
          COALESCE(SUM(CASE WHEN t.status = 'completed' AND t.type = 'commission' THEN t.amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN t.status = 'completed' THEN t.id END) as transactions,
          COUNT(DISTINCT CASE WHEN bma.activated_at::date = ${dateFormat} THEN bma.id END) as new_activations,
          COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.metadata->>'user_id' END) as active_users
        FROM date_series ds
        LEFT JOIN transactions t ON ${dateFormat} = ds.date 
          AND t.user_id = $1 ${botCondition}
        LEFT JOIN bot_module_activations bma ON bma.activated_at::date = ds.date
          AND bma.bot_id IN (SELECT id FROM bots WHERE user_id = $1)
        GROUP BY ds.date
        ORDER BY ds.date DESC
      )
      SELECT 
        period::text as date,
        revenue::numeric as revenue,
        transactions::integer as transactions,
        new_activations::integer as new_activations,
        active_users::integer as active_users
      FROM stats
      LIMIT ${limit}
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get module performance analytics
  static async getModuleAnalytics(userId: string): Promise<ModuleAnalytics[]> {
    const query = `
      SELECT 
        m.id as module_id,
        m.name as module_name,
        m.category,
        COUNT(bma.id) as total_activations,
        COUNT(CASE WHEN bma.status = 'active' THEN bma.id END) as active_activations,
        COALESCE(SUM(
          CASE WHEN t.status = 'completed' AND t.type = 'commission' 
          THEN t.amount ELSE 0 END
        ), 0) as total_revenue,
        COALESCE(AVG(bma.markup_percentage), 0) as average_markup
      FROM modules m
      LEFT JOIN bot_module_activations bma ON m.id = bma.module_id
      LEFT JOIN bots b ON bma.bot_id = b.id AND b.user_id = $1
      LEFT JOIN transactions t ON t.user_id = $1 
        AND t.metadata->>'module_id' = m.id::text
      WHERE bma.bot_id IN (SELECT id FROM bots WHERE user_id = $1)
         OR bma.bot_id IS NULL
      GROUP BY m.id, m.name, m.category
      HAVING COUNT(bma.id) > 0
      ORDER BY total_revenue DESC
    `;

    const result = await pool.query(query, [userId]);
    
    return result.rows.map(row => ({
      module_id: row.module_id,
      module_name: row.module_name,
      category: row.category,
      total_activations: parseInt(row.total_activations),
      active_activations: parseInt(row.active_activations),
      total_revenue: parseFloat(row.total_revenue),
      average_markup: parseFloat(row.average_markup)
    }));
  }

  // Admin analytics - platform overview
  static async getPlatformStats(): Promise<{
    total_users: number;
    active_users: number;
    total_bots: number;
    active_bots: number;
    total_modules: number;
    active_modules: number;
    total_revenue: number;
    monthly_revenue: number;
    total_transactions: number;
    pending_withdrawals: number;
  }> {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(DISTINCT user_id) FROM transactions 
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as active_users,
        (SELECT COUNT(*) FROM bots) as total_bots,
        (SELECT COUNT(*) FROM bots WHERE status = 'active') as active_bots,
        (SELECT COUNT(*) FROM modules) as total_modules,
        (SELECT COUNT(DISTINCT module_id) FROM bot_module_activations 
         WHERE status = 'active') as active_modules,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions 
         WHERE type = 'payment' AND status = 'completed') as total_revenue,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions 
         WHERE type = 'payment' AND status = 'completed' 
         AND created_at >= date_trunc('month', CURRENT_DATE)) as monthly_revenue,
        (SELECT COUNT(*) FROM transactions) as total_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions 
         WHERE type = 'withdrawal' AND status = 'pending') as pending_withdrawals
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }  
// Admin analytics - user activity reports
  static async getUserActivityReport(filters: {
    start_date?: Date;
    end_date?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    users: Array<{
      user_id: string;
      email: string;
      name: string;
      total_spent: number;
      total_earned: number;
      active_bots: number;
      active_modules: number;
      last_activity: Date;
    }>;
    total: number;
  }> {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let dateCondition = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.start_date) {
      dateCondition += ` AND u.created_at >= $${paramIndex++}`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      dateCondition += ` AND u.created_at <= $${paramIndex++}`;
      params.push(filters.end_date);
    }

    const countQuery = `
      SELECT COUNT(*) FROM users u WHERE 1=1 ${dateCondition}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT 
        u.id as user_id,
        u.email,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        COALESCE(SUM(CASE WHEN t.type = 'payment' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(CASE WHEN t.type = 'commission' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_earned,
        COUNT(DISTINCT CASE WHEN b.status = 'active' THEN b.id END) as active_bots,
        COUNT(DISTINCT CASE WHEN bma.status = 'active' THEN bma.id END) as active_modules,
        GREATEST(u.updated_at, MAX(t.created_at)) as last_activity
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id
      LEFT JOIN bots b ON u.id = b.user_id
      LEFT JOIN bot_module_activations bma ON b.id = bma.bot_id
      WHERE 1=1 ${dateCondition}
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.updated_at
      ORDER BY total_spent DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    params.push(limit, offset);
    const dataResult = await pool.query(dataQuery, params);

    return {
      users: dataResult.rows,
      total
    };
  }

  // Admin analytics - financial reports
  static async getFinancialReport(period: string = '30d'): Promise<{
    revenue_by_period: PeriodStats[];
    top_earning_users: Array<{
      user_id: string;
      email: string;
      name: string;
      total_revenue: number;
    }>;
    commission_breakdown: Array<{
      type: string;
      amount: number;
      percentage: number;
    }>;
  }> {
    // Get revenue by period
    const revenue_by_period = await this.getAdminPeriodStats(period);

    // Get top earning users
    const topUsersQuery = `
      SELECT 
        u.id as user_id,
        u.email,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        SUM(t.amount) as total_revenue
      FROM users u
      JOIN transactions t ON u.id = t.user_id
      WHERE t.type = 'payment' AND t.status = 'completed'
      GROUP BY u.id, u.email, u.first_name, u.last_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `;
    const topUsersResult = await pool.query(topUsersQuery);

    // Get commission breakdown
    const commissionQuery = `
      SELECT 
        'Platform Commission' as type,
        SUM(amount * 0.1) as amount
      FROM transactions 
      WHERE type = 'payment' AND status = 'completed'
      UNION ALL
      SELECT 
        'Developer Commission' as type,
        SUM(amount * 0.7) as amount
      FROM transactions 
      WHERE type = 'payment' AND status = 'completed'
      UNION ALL
      SELECT 
        'User Earnings' as type,
        SUM(amount * 0.2) as amount
      FROM transactions 
      WHERE type = 'payment' AND status = 'completed'
    `;
    const commissionResult = await pool.query(commissionQuery);
    
    const totalAmount = commissionResult.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const commission_breakdown = commissionResult.rows.map(row => ({
      type: row.type,
      amount: parseFloat(row.amount),
      percentage: totalAmount > 0 ? (parseFloat(row.amount) / totalAmount) * 100 : 0
    }));

    return {
      revenue_by_period,
      top_earning_users: topUsersResult.rows,
      commission_breakdown
    };
  } 
 // Helper method for admin period stats
  private static async getAdminPeriodStats(period: string): Promise<PeriodStats[]> {
    const { interval, limit } = this.getPeriodConfig(period);

    const query = `
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${limit} ${interval}',
          CURRENT_DATE,
          INTERVAL '1 ${interval}'
        )::date as date
      )
      SELECT 
        ds.date::text as date,
        COALESCE(SUM(CASE WHEN t.status = 'completed' AND t.type = 'payment' THEN t.amount ELSE 0 END), 0) as revenue,
        COUNT(CASE WHEN t.status = 'completed' THEN t.id END) as transactions,
        COUNT(DISTINCT CASE WHEN bma.activated_at::date = ds.date THEN bma.id END) as new_activations,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.user_id END) as active_users
      FROM date_series ds
      LEFT JOIN transactions t ON t.created_at::date = ds.date
      LEFT JOIN bot_module_activations bma ON bma.activated_at::date = ds.date
      GROUP BY ds.date
      ORDER BY ds.date DESC
      LIMIT ${limit}
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      date: row.date,
      revenue: parseFloat(row.revenue),
      transactions: parseInt(row.transactions),
      new_activations: parseInt(row.new_activations),
      active_users: parseInt(row.active_users)
    }));
  }

  // Helper methods
  private static getPeriodCondition(period?: string): string {
    if (!period) return '';
    
    switch (period) {
      case '7d':
        return 'AND t.created_at >= CURRENT_DATE - INTERVAL \'7 days\'';
      case '30d':
        return 'AND t.created_at >= CURRENT_DATE - INTERVAL \'30 days\'';
      case '90d':
        return 'AND t.created_at >= CURRENT_DATE - INTERVAL \'90 days\'';
      case '1y':
        return 'AND t.created_at >= CURRENT_DATE - INTERVAL \'1 year\'';
      default:
        return '';
    }
  }

  private static getPeriodConfig(period: string): {
    interval: string;
    dateFormat: string;
    limit: number;
  } {
    switch (period) {
      case '7d':
        return {
          interval: 'day',
          dateFormat: 'DATE(ds.date)',
          limit: 7
        };
      case '30d':
        return {
          interval: 'day',
          dateFormat: 'DATE(ds.date)',
          limit: 30
        };
      case '90d':
        return {
          interval: 'day',
          dateFormat: 'DATE(ds.date)',
          limit: 90
        };
      case '1y':
        return {
          interval: 'month',
          dateFormat: 'DATE_TRUNC(\'month\', ds.date)',
          limit: 12
        };
      default:
        return {
          interval: 'day',
          dateFormat: 'DATE(ds.date)',
          limit: 30
        };
    }
  }
}