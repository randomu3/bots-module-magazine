import '../integration-setup';
import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';
import { UserModel } from '../../models/User';
import { EmailVerificationTokenModel } from '../../models/EmailVerificationToken';
import { PasswordResetTokenModel } from '../../models/PasswordResetToken';

// Clear the mocked models for integration tests
jest.unmock('../../models/User');

// Mock email service to prevent actual emails during testing
jest.mock('../../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  verifyEmailConfig: jest.fn().mockResolvedValue(true)
}));

describe('Authentication Integration Tests', () => {
  let testUser: any;
  let accessToken: string;

  beforeAll(async () => {
    // Database is mocked in setup
  });

  beforeEach(async () => {
    // Clear test data between tests
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Database is mocked, no cleanup needed
  });

  describe('User Registration Flow', () => {
    const registrationData = {
      email: `integration.test.${Date.now()}@example.com`,
      password: 'testpassword123',
      first_name: 'Integration',
      last_name: 'Test'
    };

    it('should complete full registration and email verification flow', async () => {
      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.user.email).toBe(registrationData.email);
      expect(registerResponse.body.user.email_verified).toBe(false);
      expect(registerResponse.body.verification_required).toBe(true);

      // Verify user was created in database
      const createdUser = await UserModel.findByEmail(registrationData.email);
      expect(createdUser).toBeTruthy();
      expect(createdUser!.email_verified).toBe(false);

      // Step 2: Get verification token from database
      const verificationTokens = await EmailVerificationTokenModel.findByUserId(createdUser!.id);
      expect(verificationTokens).toHaveLength(1);
      const verificationToken = verificationTokens[0];
      expect(verificationToken).toBeDefined();

      // Step 3: Verify email
      const verifyResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: verificationToken!.token });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.user.email_verified).toBe(true);

      // Verify user is now verified in database
      const verifiedUser = await UserModel.findByEmail(registrationData.email);
      expect(verifiedUser!.email_verified).toBe(true);

      // Verify token was deleted
      const remainingTokens = await EmailVerificationTokenModel.findByUserId(createdUser!.id);
      expect(remainingTokens).toHaveLength(0);
    });

    it('should prevent duplicate registration with same email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(registrationData);

      // Second registration with same email
      const duplicateResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData);

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body.error.code).toBe('USER_EXISTS');
    });

    it('should reject invalid email verification token', async () => {
      const verifyResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token-123' });

      expect(verifyResponse.status).toBe(400);
      expect(verifyResponse.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('User Login Flow', () => {
    let userEmail: string;

    beforeEach(async () => {
      // Create and verify a test user
      userEmail = `login.test.${Date.now()}.${Math.random()}@example.com`;
      testUser = await UserModel.create({
        email: userEmail,
        password: 'testpassword123',
        first_name: 'Login',
        last_name: 'Test'
      });
      await UserModel.verifyEmail(testUser.id);
    });

    it('should login successfully with correct credentials', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: 'testpassword123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.message).toContain('Login successful');
      expect(loginResponse.body.user.email).toBe(userEmail);
      expect(loginResponse.body.tokens.accessToken).toBeDefined();
      expect(loginResponse.body.tokens.refreshToken).toBeDefined();

      accessToken = loginResponse.body.tokens.accessToken;
    });

    it('should reject login with incorrect password', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: 'wrongpassword'
        });

      expect(loginResponse.status).toBe(401);
      expect(loginResponse.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with non-existent email', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'testpassword123'
        });

      expect(loginResponse.status).toBe(401);
      expect(loginResponse.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Token Refresh Flow', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create and login user to get tokens
      testUser = await UserModel.create({
        email: 'refresh.test@example.com',
        password: 'testpassword123',
        first_name: 'Refresh',
        last_name: 'Test'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'refresh.test@example.com',
          password: 'testpassword123'
        });

      accessToken = loginResponse.body.tokens.accessToken;
      refreshToken = loginResponse.body.tokens.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      const refreshResponse = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.message).toContain('Token refreshed successfully');
      expect(refreshResponse.body.tokens.accessToken).toBeDefined();
      expect(refreshResponse.body.tokens.refreshToken).toBeDefined();
      
      // New tokens should be different from old ones
      expect(refreshResponse.body.tokens.accessToken).not.toBe(accessToken);
      expect(refreshResponse.body.tokens.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const refreshResponse = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-refresh-token' });

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('Password Reset Flow', () => {
    beforeEach(async () => {
      testUser = await UserModel.create({
        email: 'reset.test@example.com',
        password: 'oldpassword123',
        first_name: 'Reset',
        last_name: 'Test'
      });
    });

    it('should complete full password reset flow', async () => {
      // Step 1: Request password reset
      const resetRequestResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'reset.test@example.com' });

      expect(resetRequestResponse.status).toBe(200);
      expect(resetRequestResponse.body.message).toContain('password reset link has been sent');

      // Step 2: Get reset token from database
      const resetTokens = await PasswordResetTokenModel.findByUserId(testUser.id);
      expect(resetTokens).toHaveLength(1);
      const resetToken = resetTokens[0];
      expect(resetToken).toBeDefined();

      // Step 3: Reset password
      const newPassword = 'newpassword123';
      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken!.token,
          password: newPassword
        });

      expect(resetResponse.status).toBe(200);
      expect(resetResponse.body.message).toContain('Password reset successfully');

      // Step 4: Verify old password no longer works
      const oldPasswordLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'reset.test@example.com',
          password: 'oldpassword123'
        });

      expect(oldPasswordLogin.status).toBe(401);

      // Step 5: Verify new password works
      const newPasswordLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'reset.test@example.com',
          password: newPassword
        });

      expect(newPasswordLogin.status).toBe(200);

      // Verify reset token was deleted
      const remainingTokens = await PasswordResetTokenModel.findByUserId(testUser.id);
      expect(remainingTokens).toHaveLength(0);
    });

    it('should handle password reset request for non-existent email gracefully', async () => {
      const resetRequestResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(resetRequestResponse.status).toBe(200);
      expect(resetRequestResponse.body.message).toContain('password reset link has been sent');
      
      // Should not create any reset tokens
      const allTokens = await pool.query('SELECT * FROM password_reset_tokens');
      expect(allTokens.rows).toHaveLength(0);
    });

    it('should reject invalid password reset token', async () => {
      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-reset-token',
          password: 'newpassword123'
        });

      expect(resetResponse.status).toBe(400);
      expect(resetResponse.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Protected Routes', () => {
    beforeEach(async () => {
      // Create and login user
      testUser = await UserModel.create({
        email: 'protected.test@example.com',
        password: 'testpassword123',
        first_name: 'Protected',
        last_name: 'Test'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'protected.test@example.com',
          password: 'testpassword123'
        });

      accessToken = loginResponse.body.tokens.accessToken;
    });

    it('should access profile with valid token', async () => {
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.user.email).toBe('protected.test@example.com');
      expect(profileResponse.body.user.password_hash).toBeUndefined();
    });

    it('should reject profile access without token', async () => {
      const profileResponse = await request(app)
        .get('/api/auth/profile');

      expect(profileResponse.status).toBe(401);
      expect(profileResponse.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should reject profile access with invalid token', async () => {
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(profileResponse.status).toBe(401);
      expect(profileResponse.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should logout successfully', async () => {
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.message).toContain('Logged out successfully');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on registration endpoint', async () => {
      // Clear any existing rate limit data
      const { clearRateLimitData } = require('../../middleware/authMiddleware');
      clearRateLimitData();

      const registrationData = {
        email: 'ratelimit.test@example.com',
        password: 'testpassword123',
        first_name: 'Rate',
        last_name: 'Limit'
      };

      // Make multiple requests quickly (rate limit is 5 per 15 minutes)
      const responses = [];
      for (let i = 0; i < 6; i++) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...registrationData, email: `ratelimit${i}@example.com` });
        responses.push(response);
      }

      // 6th should be rate limited
      const rateLimitedResponses = responses.filter((r: any) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      const rateLimitedResponse = rateLimitedResponses[0];
      expect(rateLimitedResponse?.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should enforce rate limiting on login endpoint', async () => {
      // Clear any existing rate limit data
      const { clearRateLimitData } = require('../../middleware/authMiddleware');
      clearRateLimitData();

      // Create a test user first
      await UserModel.create({
        email: 'ratelimit.login@example.com',
        password: 'testpassword123',
        first_name: 'Rate',
        last_name: 'Limit'
      });

      // Make multiple login attempts quickly
      const responses = [];
      for (let i = 0; i < 6; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'ratelimit.login@example.com',
            password: 'wrongpassword'
          });
        responses.push(response);
      }

      // Should have at least one rate limited response
      const rateLimitedResponses = responses.filter((r: any) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should validate email format in registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email-format',
          password: 'testpassword123',
          first_name: 'Test',
          last_name: 'User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate password strength in registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123', // Too short
          first_name: 'Test',
          last_name: 'User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate required fields in registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate email format in login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'testpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate password strength in password reset', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'some-token',
          password: '123' // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});