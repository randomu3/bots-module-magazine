import crypto from 'crypto';
import pool from '../config/database';
import { EmailVerificationToken } from '../types/database';

export class EmailVerificationTokenModel {
  private static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async create(userId: string, expiresInHours: number = 24): Promise<EmailVerificationToken> {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const query = `
      INSERT INTO email_verification_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [userId, token, expiresAt];

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

  static async findByToken(token: string): Promise<EmailVerificationToken | null> {
    const query = `
      SELECT * FROM email_verification_tokens 
      WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
    `;
    const result = await pool.query(query, [token]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<EmailVerificationToken[]> {
    const query = `
      SELECT * FROM email_verification_tokens 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async deleteByToken(token: string): Promise<boolean> {
    const query = 'DELETE FROM email_verification_tokens WHERE token = $1';
    const result = await pool.query(query, [token]);
    return (result.rowCount || 0) > 0;
  }

  static async deleteByUserId(userId: string): Promise<number> {
    const query = 'DELETE FROM email_verification_tokens WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rowCount || 0;
  }

  static async deleteExpired(): Promise<number> {
    const query = 'DELETE FROM email_verification_tokens WHERE expires_at <= CURRENT_TIMESTAMP';
    const result = await pool.query(query);
    return result.rowCount || 0;
  }

  static async isValidToken(token: string): Promise<boolean> {
    const tokenRecord = await this.findByToken(token);
    return tokenRecord !== null;
  }

  static async verifyAndDelete(token: string): Promise<string | null> {
    const tokenRecord = await this.findByToken(token);
    if (!tokenRecord) {
      return null;
    }

    await this.deleteByToken(token);
    return tokenRecord.user_id;
  }
}