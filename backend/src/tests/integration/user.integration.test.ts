import '../integration-setup';
import request from 'supertest';
import app from '../../index';
import { UserModel } from '../../models/User';
import { EmailVerificationTokenModel } from '../../models/EmailVerificationToken';

// Mock email service
jest.mock('../../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  verifyEmailConfig: jest.fn().mockResolvedValue(true)
}));

describe('User Management Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let testUser: any;

  beforeAll(async () => {
    // Create and verify test user
    const userData = {
      email: `usertest-${Date.now()}@example.com`,
      password: 'testpassword123',
      first_name: 'User',
      last_name: 'Tester'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(registerResponse.status).toBe(201);
    userId = registerResponse.body.user.id;
    testUser = registerResponse.body.user;

    // Verify email
    const verificationTokens = await EmailVerificationTokenModel.findByUserId(userId);
    await request(app)
      .post('/api/auth/verify-email')
      .send({ token: verificationTokens[0]?.token });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    authToken = loginResponse.body.tokens.accessToken;
  });

  describe('GET /api/users/profile', () => {
    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        id: userId,
        email: testUser.email,
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: 'user',
        email_verified: true
      });
      expect(response.body.user.password_hash).toBeUndefined();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        first_name: 'Updated',
        last_name: 'Name',
        theme_preference: 'dark'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        id: userId,
        first_name: 'Updated',
        last_name: 'Name',
        theme_preference: 'dark'
      });
    });

    it('should validate profile update data', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: '', // Empty name should be invalid
          theme_preference: 'invalid_theme'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/users/balance', () => {
    it('should get user balance', async () => {
      const response = await request(app)
        .get('/api/users/balance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('balance');
      expect(response.body).toHaveProperty('currency');
      expect(typeof response.body.balance).toBe('number');
      expect(response.body.currency).toBe('USD');
    });
  });

  describe('GET /api/users/transactions', () => {
    it('should get user transaction history', async () => {
      const response = await request(app)
        .get('/api/users/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.transactions)).toBe(true);
    });

    it('should support transaction filtering', async () => {
      const response = await request(app)
        .get('/api/users/transactions?type=payment&status=completed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.transactions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'payment',
            status: 'completed'
          })
        ])
      );
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/users/transactions?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 5,
        total: expect.any(Number),
        pages: expect.any(Number)
      });
    });
  });

  describe('GET /api/users/referrals', () => {
    it('should get referral information', async () => {
      const response = await request(app)
        .get('/api/users/referrals')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('referral_code');
      expect(response.body).toHaveProperty('referral_link');
      expect(response.body).toHaveProperty('referrals');
      expect(response.body).toHaveProperty('earnings');
      expect(Array.isArray(response.body.referrals)).toBe(true);
    });
  });

  describe('POST /api/users/referral-link', () => {
    it('should generate new referral link', async () => {
      const response = await request(app)
        .post('/api/users/referral-link')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('referral_code');
      expect(response.body).toHaveProperty('referral_link');
      expect(response.body.referral_link).toContain(response.body.referral_code);
    });
  });

  describe('User Settings Management', () => {
    it('should update notification preferences', async () => {
      const response = await request(app)
        .put('/api/users/settings/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email_notifications: false,
          push_notifications: true,
          marketing_emails: false
        });

      expect(response.status).toBe(200);
      expect(response.body.settings).toMatchObject({
        email_notifications: false,
        push_notifications: true,
        marketing_emails: false
      });
    });

    it('should update privacy settings', async () => {
      const response = await request(app)
        .put('/api/users/settings/privacy')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profile_visibility: 'private',
          show_earnings: false
        });

      expect(response.status).toBe(200);
      expect(response.body.settings).toMatchObject({
        profile_visibility: 'private',
        show_earnings: false
      });
    });
  });

  describe('User Account Management', () => {
    it('should change password successfully', async () => {
      const response = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          current_password: 'testpassword123',
          new_password: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Password changed successfully');

      // Verify old password no longer works
      const oldPasswordLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'testpassword123'
        });

      expect(oldPasswordLogin.status).toBe(401);

      // Verify new password works
      const newPasswordLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'newpassword123'
        });

      expect(newPasswordLogin.status).toBe(200);
    });

    it('should reject password change with wrong current password', async () => {
      const response = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          current_password: 'wrongpassword',
          new_password: 'newpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('should validate new password strength', async () => {
      const response = await request(app)
        .put('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          current_password: 'newpassword123',
          new_password: '123' // Too weak
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('User Data Export', () => {
    it('should export user data', async () => {
      const response = await request(app)
        .get('/api/users/export-data')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user_data');
      expect(response.body).toHaveProperty('bots');
      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('modules');
      expect(response.body.user_data.email).toBe(testUser.email);
    });
  });

  describe('Account Deletion', () => {
    it('should initiate account deletion process', async () => {
      const response = await request(app)
        .post('/api/users/delete-account')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'newpassword123',
          confirmation: 'DELETE'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Account deletion initiated');
      expect(response.body).toHaveProperty('deletion_token');
    });

    it('should reject account deletion with wrong password', async () => {
      const response = await request(app)
        .post('/api/users/delete-account')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'wrongpassword',
          confirmation: 'DELETE'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PASSWORD');
    });

    it('should reject account deletion without proper confirmation', async () => {
      const response = await request(app)
        .post('/api/users/delete-account')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'newpassword123',
          confirmation: 'WRONG'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_CONFIRMATION');
    });
  });
});