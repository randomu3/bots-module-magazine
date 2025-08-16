import { pool } from '../database/connection';
import { User } from '../models/User';
import { Bot } from '../models/Bot';
import { Module } from '../models/Module';
import { Transaction } from '../models/Transaction';
import { SupportTicket } from '../models/SupportTicket';

export interface AdminDashboardStats {
  totalUsers: number;
  totalBots: number;
  totalModules: number;
  totalRevenue: number;
  activeUsers: number;
  pendingWithdrawals: number;
  pendingTickets: number;
  pendingModules: number;
  revenueGrowth: number;
  userGrowth: number;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin' | 'developer';
  balance: number;
  emailVerified: boolean;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
  totalBots: number;
  totalRevenue: number;
}

export interface AdminBot {
  id: string;
  name: string;
  username: string;
  userId: string;
  userEmail: string;
  status: 'active' | 'inactive' | 'suspended';
  activeModules: number;
  totalRevenue: number;
  createdAt: string;
}

export interface AdminModule {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  developerId: string;
  developerEmail: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  activations: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWithdrawal {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  paymentMethod: string;
  paymentDetails: Record<string, any>;
  createdAt: string;
  processedAt?: string;
  notes?: string;
}

export interface AdminTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: string;
  createdAt: string;
  updatedAt: string;
  messagesCount: number;
  assignedTo?: string;
}

export class AdminService {
  static async getDashboardStats(): Promise<AdminDashboardStats> {
    const client = await pool.connect();
    
    try {
      // Get current stats
      const [
        usersResult,
        botsResult,
        modulesResult,
        revenueResult,
        activeUsersResult,
        pendingWithdrawalsResult,
        pendingTicketsResult,
        pendingModulesResult
      ] = await Promise.all([
        client.query('SELECT COUNT(*) as count FROM users'),
        client.query('SELECT COUNT(*) as count FROM bots'),
        client.query('SELECT COUNT(*) as count FROM modules WHERE status = $1', ['approved']),
        client.query(`
          SELECT COALESCE(SUM(amount), 0) as total 
          FROM transactions 
          WHERE type = 'payment' AND status = 'completed'
        `),
        client.query(`
          SELECT COUNT(DISTINCT user_id) as count 
          FROM user_sessions 
          WHERE last_activity > NOW() - INTERVAL '30 days'
        `),
        client.query(`
          SELECT COUNT(*) as count 
          FROM transactions 
          WHERE type = 'withdrawal' AND status = 'pending'
        `),
        client.query(`
          SELECT COUNT(*) as count 
          FROM support_tickets 
          WHERE status IN ('open', 'in_progress')
        `),
        client.query(`
          SELECT COUNT(*) as count 
          FROM modules 
          WHERE status = 'pending'
        `)
      ]);

      // Get growth stats (compare with previous month)
      const [userGrowthResult, revenueGrowthResult] = await Promise.all([
        client.query(`
          SELECT 
            COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as current_month,
            COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
                       AND created_at < DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as previous_month
          FROM users
        `),
        client.query(`
          SELECT 
            COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN amount END), 0) as current_month,
            COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
                              AND created_at < DATE_TRUNC('month', CURRENT_DATE) THEN amount END), 0) as previous_month
          FROM transactions 
          WHERE type = 'payment' AND status = 'completed'
        `)
      ]);

      const userGrowth = this.calculateGrowthPercentage(
        userGrowthResult.rows[0].current_month,
        userGrowthResult.rows[0].previous_month
      );

      const revenueGrowth = this.calculateGrowthPercentage(
        parseFloat(revenueGrowthResult.rows[0].current_month),
        parseFloat(revenueGrowthResult.rows[0].previous_month)
      );

      return {
        totalUsers: parseInt(usersResult.rows[0].count),
        totalBots: parseInt(botsResult.rows[0].count),
        totalModules: parseInt(modulesResult.rows[0].count),
        totalRevenue: parseFloat(revenueResult.rows[0].total),
        activeUsers: parseInt(activeUsersResult.rows[0].count),
        pendingWithdrawals: parseInt(pendingWithdrawalsResult.rows[0].count),
        pendingTickets: parseInt(pendingTicketsResult.rows[0].count),
        pendingModules: parseInt(pendingModulesResult.rows[0].count),
        revenueGrowth,
        userGrowth
      };
    } finally {
      client.release();
    }
  }

  static async getUsers(params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }): Promise<{
    users: AdminUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const client = await pool.connect();
    
    try {
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (params.search) {
        whereClause += ` AND (email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
        queryParams.push(`%${params.search}%`);
        paramIndex++;
      }

      if (params.role) {
        whereClause += ` AND role = $${paramIndex}`;
        queryParams.push(params.role);
        paramIndex++;
      }

      if (params.status) {
        whereClause += ` AND status = $${paramIndex}`;
        queryParams.push(params.status);
        paramIndex++;
      }

      const offset = (params.page - 1) * params.limit;
      const orderBy = `ORDER BY ${params.sortBy} ${params.sortOrder.toUpperCase()}`;

      const [usersResult, countResult] = await Promise.all([
        client.query(`
          SELECT 
            u.*,
            COALESCE(bot_stats.total_bots, 0) as total_bots,
            COALESCE(revenue_stats.total_revenue, 0) as total_revenue
          FROM users u
          LEFT JOIN (
            SELECT user_id, COUNT(*) as total_bots
            FROM bots
            GROUP BY user_id
          ) bot_stats ON u.id = bot_stats.user_id
          LEFT JOIN (
            SELECT user_id, SUM(amount) as total_revenue
            FROM transactions
            WHERE type = 'payment' AND status = 'completed'
            GROUP BY user_id
          ) revenue_stats ON u.id = revenue_stats.user_id
          ${whereClause}
          ${orderBy}
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...queryParams, params.limit, offset]),
        client.query(`SELECT COUNT(*) as count FROM users ${whereClause}`, queryParams)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / params.limit);

      const users: AdminUser[] = usersResult.rows.map(row => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        role: row.role,
        balance: parseFloat(row.balance),
        emailVerified: row.email_verified,
        status: row.status,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        totalBots: parseInt(row.total_bots),
        totalRevenue: parseFloat(row.total_revenue || 0)
      }));

      return {
        users,
        total,
        page: params.page,
        totalPages
      };
    } finally {
      client.release();
    }
  }

  static async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(
        'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, userId]
      );
    } finally {
      client.release();
    }
  }

  static async updateUserBalance(userId: string, amount: number, operation: 'add' | 'subtract'): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const operator = operation === 'add' ? '+' : '-';
      await client.query(
        `UPDATE users SET balance = balance ${operator} $1, updated_at = NOW() WHERE id = $2`,
        [amount, userId]
      );

      // Create transaction record
      await client.query(`
        INSERT INTO transactions (user_id, type, amount, status, description, created_at)
        VALUES ($1, $2, $3, 'completed', $4, NOW())
      `, [
        userId,
        operation === 'add' ? 'admin_credit' : 'admin_debit',
        amount,
        `Admin ${operation === 'add' ? 'credit' : 'debit'} adjustment`
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getBots(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    userId?: string;
  }): Promise<{
    bots: AdminBot[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const client = await pool.connect();
    
    try {
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (params.search) {
        whereClause += ` AND (b.name ILIKE $${paramIndex} OR b.username ILIKE $${paramIndex})`;
        queryParams.push(`%${params.search}%`);
        paramIndex++;
      }

      if (params.status) {
        whereClause += ` AND b.status = $${paramIndex}`;
        queryParams.push(params.status);
        paramIndex++;
      }

      if (params.userId) {
        whereClause += ` AND b.user_id = $${paramIndex}`;
        queryParams.push(params.userId);
        paramIndex++;
      }

      const offset = (params.page - 1) * params.limit;

      const [botsResult, countResult] = await Promise.all([
        client.query(`
          SELECT 
            b.*,
            u.email as user_email,
            COALESCE(module_stats.active_modules, 0) as active_modules,
            COALESCE(revenue_stats.total_revenue, 0) as total_revenue
          FROM bots b
          JOIN users u ON b.user_id = u.id
          LEFT JOIN (
            SELECT bot_id, COUNT(*) as active_modules
            FROM bot_module_activations
            WHERE status = 'active'
            GROUP BY bot_id
          ) module_stats ON b.id = module_stats.bot_id
          LEFT JOIN (
            SELECT bot_id, SUM(amount) as total_revenue
            FROM transactions t
            JOIN bot_module_activations bma ON t.module_activation_id = bma.id
            WHERE t.type = 'payment' AND t.status = 'completed'
            GROUP BY bot_id
          ) revenue_stats ON b.id = revenue_stats.bot_id
          ${whereClause}
          ORDER BY b.created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...queryParams, params.limit, offset]),
        client.query(`
          SELECT COUNT(*) as count 
          FROM bots b 
          JOIN users u ON b.user_id = u.id 
          ${whereClause}
        `, queryParams)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / params.limit);

      const bots: AdminBot[] = botsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        username: row.username,
        userId: row.user_id,
        userEmail: row.user_email,
        status: row.status,
        activeModules: parseInt(row.active_modules),
        totalRevenue: parseFloat(row.total_revenue || 0),
        createdAt: row.created_at
      }));

      return {
        bots,
        total,
        page: params.page,
        totalPages
      };
    } finally {
      client.release();
    }
  }

  static async updateBotStatus(botId: string, status: 'active' | 'inactive' | 'suspended'): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(
        'UPDATE bots SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, botId]
      );
    } finally {
      client.release();
    }
  }

  static async getModules(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    category?: string;
  }): Promise<{
    modules: AdminModule[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const client = await pool.connect();
    
    try {
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (params.search) {
        whereClause += ` AND (m.name ILIKE $${paramIndex} OR m.description ILIKE $${paramIndex})`;
        queryParams.push(`%${params.search}%`);
        paramIndex++;
      }

      if (params.status) {
        whereClause += ` AND m.status = $${paramIndex}`;
        queryParams.push(params.status);
        paramIndex++;
      }

      if (params.category) {
        whereClause += ` AND m.category = $${paramIndex}`;
        queryParams.push(params.category);
        paramIndex++;
      }

      const offset = (params.page - 1) * params.limit;

      const [modulesResult, countResult] = await Promise.all([
        client.query(`
          SELECT 
            m.*,
            u.email as developer_email,
            COALESCE(activation_stats.activations, 0) as activations,
            COALESCE(revenue_stats.revenue, 0) as revenue
          FROM modules m
          JOIN users u ON m.developer_id = u.id
          LEFT JOIN (
            SELECT module_id, COUNT(*) as activations
            FROM bot_module_activations
            GROUP BY module_id
          ) activation_stats ON m.id = activation_stats.module_id
          LEFT JOIN (
            SELECT 
              bma.module_id,
              SUM(t.amount) as revenue
            FROM transactions t
            JOIN bot_module_activations bma ON t.module_activation_id = bma.id
            WHERE t.type = 'payment' AND t.status = 'completed'
            GROUP BY bma.module_id
          ) revenue_stats ON m.id = revenue_stats.module_id
          ${whereClause}
          ORDER BY m.created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...queryParams, params.limit, offset]),
        client.query(`
          SELECT COUNT(*) as count 
          FROM modules m 
          JOIN users u ON m.developer_id = u.id 
          ${whereClause}
        `, queryParams)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / params.limit);

      const modules: AdminModule[] = modulesResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        price: parseFloat(row.price),
        developerId: row.developer_id,
        developerEmail: row.developer_email,
        status: row.status,
        activations: parseInt(row.activations),
        revenue: parseFloat(row.revenue || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return {
        modules,
        total,
        page: params.page,
        totalPages
      };
    } finally {
      client.release();
    }
  }

  static async updateModuleStatus(moduleId: string, status: 'approved' | 'rejected' | 'suspended', notes?: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(
        'UPDATE modules SET status = $1, moderation_notes = $2, updated_at = NOW() WHERE id = $3',
        [status, notes, moduleId]
      );
    } finally {
      client.release();
    }
  }

  static async getWithdrawals(params: {
    page: number;
    limit: number;
    status?: string;
    userId?: string;
  }): Promise<{
    withdrawals: AdminWithdrawal[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const client = await pool.connect();
    
    try {
      let whereClause = 'WHERE t.type = \'withdrawal\'';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (params.status) {
        whereClause += ` AND t.status = $${paramIndex}`;
        queryParams.push(params.status);
        paramIndex++;
      }

      if (params.userId) {
        whereClause += ` AND t.user_id = $${paramIndex}`;
        queryParams.push(params.userId);
        paramIndex++;
      }

      const offset = (params.page - 1) * params.limit;

      const [withdrawalsResult, countResult] = await Promise.all([
        client.query(`
          SELECT 
            t.*,
            u.email as user_email
          FROM transactions t
          JOIN users u ON t.user_id = u.id
          ${whereClause}
          ORDER BY t.created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...queryParams, params.limit, offset]),
        client.query(`
          SELECT COUNT(*) as count 
          FROM transactions t 
          JOIN users u ON t.user_id = u.id 
          ${whereClause}
        `, queryParams)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / params.limit);

      const withdrawals: AdminWithdrawal[] = withdrawalsResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        amount: parseFloat(row.amount),
        currency: row.currency || 'RUB',
        status: row.status,
        paymentMethod: row.payment_method || 'bank_transfer',
        paymentDetails: row.payment_details || {},
        createdAt: row.created_at,
        processedAt: row.processed_at,
        notes: row.notes
      }));

      return {
        withdrawals,
        total,
        page: params.page,
        totalPages
      };
    } finally {
      client.release();
    }
  }

  static async processWithdrawal(withdrawalId: string, action: 'approve' | 'reject', notes?: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const status = action === 'approve' ? 'completed' : 'rejected';
      
      await client.query(`
        UPDATE transactions 
        SET status = $1, processed_at = NOW(), notes = $2 
        WHERE id = $3 AND type = 'withdrawal'
      `, [status, notes, withdrawalId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getTickets(params: {
    page: number;
    limit: number;
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: string;
  }): Promise<{
    tickets: AdminTicket[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const client = await pool.connect();
    
    try {
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (params.status) {
        whereClause += ` AND st.status = $${paramIndex}`;
        queryParams.push(params.status);
        paramIndex++;
      }

      if (params.priority) {
        whereClause += ` AND st.priority = $${paramIndex}`;
        queryParams.push(params.priority);
        paramIndex++;
      }

      if (params.category) {
        whereClause += ` AND st.category = $${paramIndex}`;
        queryParams.push(params.category);
        paramIndex++;
      }

      if (params.assignedTo) {
        whereClause += ` AND st.assigned_to = $${paramIndex}`;
        queryParams.push(params.assignedTo);
        paramIndex++;
      }

      const offset = (params.page - 1) * params.limit;

      const [ticketsResult, countResult] = await Promise.all([
        client.query(`
          SELECT 
            st.*,
            u.email as user_email,
            COALESCE(message_stats.messages_count, 0) as messages_count
          FROM support_tickets st
          JOIN users u ON st.user_id = u.id
          LEFT JOIN (
            SELECT ticket_id, COUNT(*) as messages_count
            FROM support_messages
            GROUP BY ticket_id
          ) message_stats ON st.id = message_stats.ticket_id
          ${whereClause}
          ORDER BY st.created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...queryParams, params.limit, offset]),
        client.query(`
          SELECT COUNT(*) as count 
          FROM support_tickets st 
          JOIN users u ON st.user_id = u.id 
          ${whereClause}
        `, queryParams)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / params.limit);

      const tickets: AdminTicket[] = ticketsResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        subject: row.subject,
        priority: row.priority,
        status: row.status,
        category: row.category,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messagesCount: parseInt(row.messages_count),
        assignedTo: row.assigned_to
      }));

      return {
        tickets,
        total,
        page: params.page,
        totalPages
      };
    } finally {
      client.release();
    }
  }

  static async updateTicketStatus(ticketId: string, status: 'open' | 'in_progress' | 'resolved' | 'closed'): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(
        'UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, ticketId]
      );
    } finally {
      client.release();
    }
  }

  static async assignTicket(ticketId: string, assignedTo: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query(
        'UPDATE support_tickets SET assigned_to = $1, updated_at = NOW() WHERE id = $2',
        [assignedTo, ticketId]
      );
    } finally {
      client.release();
    }
  }

  private static calculateGrowthPercentage(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }
}