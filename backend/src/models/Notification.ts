import pool from '../config/database';

export type NotificationType = 
  | 'email_verification'
  | 'password_reset'
  | 'welcome'
  | 'payment_received'
  | 'payment_failed'
  | 'withdrawal_requested'
  | 'withdrawal_completed'
  | 'withdrawal_failed'
  | 'module_activated'
  | 'module_expired'
  | 'referral_commission'
  | 'system_announcement'
  | 'support_ticket_created'
  | 'support_ticket_replied';

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  email_sent: boolean;
  email_sent_at?: Date;
  read_at?: Date;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  target_audience: Record<string, any>;
  status: string;
  scheduled_at?: Date;
  sent_at?: Date;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  payment_notifications: boolean;
  withdrawal_notifications: boolean;
  module_notifications: boolean;
  referral_notifications: boolean;
  system_notifications: boolean;
  support_notifications: boolean;
}

export interface CreateNotificationInput {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface CreateBroadcastInput {
  title: string;
  message: string;
  type?: NotificationType;
  target_audience?: Record<string, any>;
  scheduled_at?: Date;
  metadata?: Record<string, any>;
}

export class NotificationModel {
  static async create(input: CreateNotificationInput): Promise<Notification> {
    const { user_id, type, title, message, metadata = {} } = input;

    const query = `
      INSERT INTO notifications (user_id, type, title, message, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [user_id, type, title, message, JSON.stringify(metadata)];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: string): Promise<Notification | null> {
    const query = 'SELECT * FROM notifications WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(
    userId: string,
    options: {
      type?: NotificationType;
      status?: NotificationStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Notification[]> {
    const { type, status, limit = 50, offset = 0 } = options;
    
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const values: any[] = [userId];
    let paramIndex = 2;

    if (type) {
      query += ` AND type = $${paramIndex++}`;
      values.push(type);
    }

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async updateStatus(id: string, status: NotificationStatus): Promise<Notification | null> {
    const query = `
      UPDATE notifications 
      SET status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, [id, status]);
    return result.rows[0] || null;
  }

  static async markAsEmailSent(id: string): Promise<Notification | null> {
    const query = `
      UPDATE notifications 
      SET email_sent = true, email_sent_at = CURRENT_TIMESTAMP, status = 'sent', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async markAsRead(id: string): Promise<Notification | null> {
    const query = `
      UPDATE notifications 
      SET status = 'read', read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async markAllAsRead(userId: string): Promise<number> {
    const query = `
      UPDATE notifications 
      SET status = 'read', read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND status != 'read'
    `;

    const result = await pool.query(query, [userId]);
    return result.rowCount || 0;
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND status != \'read\'';
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  static async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const query = 'SELECT notification_preferences FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    
    if (!result.rows[0]) {
      throw new Error('User not found');
    }

    return result.rows[0].notification_preferences || {
      email_notifications: true,
      payment_notifications: true,
      withdrawal_notifications: true,
      module_notifications: true,
      referral_notifications: true,
      system_notifications: true,
      support_notifications: true
    };
  }

  static async updateUserNotificationPreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const currentPrefs = await this.getUserNotificationPreferences(userId);
    const updatedPrefs = { ...currentPrefs, ...preferences };

    const query = `
      UPDATE users 
      SET notification_preferences = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING notification_preferences
    `;

    const result = await pool.query(query, [userId, JSON.stringify(updatedPrefs)]);
    return result.rows[0].notification_preferences;
  }

  // Broadcast notification methods
  static async createBroadcast(input: CreateBroadcastInput): Promise<BroadcastNotification> {
    const { 
      title, 
      message, 
      type = 'system_announcement', 
      target_audience = { all: true }, 
      scheduled_at,
      metadata = {} 
    } = input;

    const query = `
      INSERT INTO broadcast_notifications (title, message, type, target_audience, scheduled_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      title, 
      message, 
      type, 
      JSON.stringify(target_audience), 
      scheduled_at, 
      JSON.stringify(metadata)
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getBroadcastById(id: string): Promise<BroadcastNotification | null> {
    const query = 'SELECT * FROM broadcast_notifications WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getPendingBroadcasts(): Promise<BroadcastNotification[]> {
    const query = `
      SELECT * FROM broadcast_notifications 
      WHERE status = 'scheduled' AND scheduled_at <= CURRENT_TIMESTAMP
      ORDER BY scheduled_at ASC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  static async updateBroadcastStatus(
    id: string, 
    status: string, 
    stats?: { total_recipients?: number; successful_sends?: number; failed_sends?: number }
  ): Promise<BroadcastNotification | null> {
    let query = `
      UPDATE broadcast_notifications 
      SET status = $2, updated_at = CURRENT_TIMESTAMP
    `;
    
    const values: any[] = [id, status];
    let paramIndex = 3;

    if (status === 'sent') {
      query += `, sent_at = CURRENT_TIMESTAMP`;
    }

    if (stats) {
      if (stats.total_recipients !== undefined) {
        query += `, total_recipients = $${paramIndex++}`;
        values.push(stats.total_recipients);
      }
      if (stats.successful_sends !== undefined) {
        query += `, successful_sends = $${paramIndex++}`;
        values.push(stats.successful_sends);
      }
      if (stats.failed_sends !== undefined) {
        query += `, failed_sends = $${paramIndex++}`;
        values.push(stats.failed_sends);
      }
    }

    query += ` WHERE id = $1 RETURNING *`;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async listBroadcasts(options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<BroadcastNotification[]> {
    const { status, limit = 50, offset = 0 } = options;
    
    let query = 'SELECT * FROM broadcast_notifications';
    const values: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` WHERE status = $${paramIndex++}`;
      values.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }
}