import request from 'supertest';
import app from '../../index';
import { UserModel } from '../../models/User';
import { EmailVerificationTokenModel } from '../../models/EmailVerificationToken';
import { PasswordResetTokenModel } from '../../models/PasswordResetToken';
import * as emailService from '../../services/emailService';

// Mock the email service
jest.mock('../../services/emailService');
const mockedEmailService = emailService as jest.Mocked<typeof emailService>;

// Mock the models
jest.mock('../../models/User');
jest.mock('../../models/EmailVerificationToken');
jest.mock('../../models/PasswordResetToken');

const mockedUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockedEmailVerificationTokenModel = EmailVerificationTokenModel as jest.Mocked<typeof EmailVerificationTokenModel>;
const mockedPasswordResetTokenModel = PasswordResetTokenModel as jest.Mocked<typeof PasswordResetTokenModel>;

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'John',
      last_name: 'Doe'
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        balance: 0,
        referral_code: 'REF123',
        email_verified: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockToken = {
        id: 'token-id-123',
        user_id: 'user-id-123',
        token: 'verification-token-123',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        created_at: new Date()
      };

      mockedUserModel.findByEmail.mockResolvedValue(null);
      mockedUserModel.create.mockResolvedValue(mockUser as any);
      mockedEmailVerificationTokenModel.create.mockResolvedValue(mockToken);
      mockedEmailService.sendVerificationEmail.mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('registered successfully');
      expect(response.body.user.email).toBe(validRegistrationData.email);
      expect(response.body.user.password_hash).toBeUndefined();
      expect(response.body.verification_required).toBe(true);

      expect(mockedUserModel.findByEmail).toHaveBeenCalledWith(validRegistrationData.email);
      expect(mockedUserModel.create).toHaveBeenCalledWith(validRegistrationData);
      expect(mockedEmailVerificationTokenModel.create).toHaveBeenCalledWith(mockUser.id);
      expect(mockedEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockToken.token,
        mockUser.first_name
      );
    });

    it('should return error if user already exists', async () => {
      const existingUser = { id: 'existing-user', email: 'test@example.com' };
      mockedUserModel.findByEmail.mockResolvedValue(existingUser as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('USER_EXISTS');
      expect(response.body.error.message).toContain('already exists');
    });

    it('should return validation error for invalid email', async () => {
      const invalidData = { ...validRegistrationData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for short password', async () => {
      const invalidData = { ...validRegistrationData, password: '123' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should continue registration even if email sending fails', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        balance: 0,
        referral_code: 'REF123',
        email_verified: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockToken = {
        id: 'token-id-123',
        user_id: 'user-id-123',
        token: 'verification-token-123',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        created_at: new Date()
      };

      mockedUserModel.findByEmail.mockResolvedValue(null);
      mockedUserModel.create.mockResolvedValue(mockUser as any);
      mockedEmailVerificationTokenModel.create.mockResolvedValue(mockToken);
      mockedEmailService.sendVerificationEmail.mockRejectedValue(new Error('Email service error'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('registered successfully');
    });
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should login user successfully', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        balance: 0,
        referral_code: 'REF123',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockedUserModel.findByEmail.mockResolvedValue(mockUser as any);
      mockedUserModel.verifyPassword.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Login successful');
      expect(response.body.user.email).toBe(validLoginData.email);
      expect(response.body.user.password_hash).toBeUndefined();
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();

      expect(mockedUserModel.findByEmail).toHaveBeenCalledWith(validLoginData.email);
      expect(mockedUserModel.verifyPassword).toHaveBeenCalledWith(mockUser, validLoginData.password);
    });

    it('should return error for non-existent user', async () => {
      mockedUserModel.findByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return error for invalid password', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        password_hash: 'hashed-password'
      };

      mockedUserModel.findByEmail.mockResolvedValue(mockUser as any);
      mockedUserModel.verifyPassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return validation error for invalid email format', async () => {
      const invalidData = { ...validLoginData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh token successfully', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        role: 'user'
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Token refreshed successfully');
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
    });

    it('should return error for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_REFRESH_TOKEN');
    });

    it('should return error for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should return error if user no longer exists', async () => {
      mockedUserModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'valid-token-nonexistent-user' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should verify email successfully', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        email_verified: true,
        first_name: 'John'
      };

      mockedEmailVerificationTokenModel.verifyAndDelete.mockResolvedValue('user-id-123');
      mockedUserModel.verifyEmail.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'valid-token' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Email verified successfully');
      expect(response.body.user.email_verified).toBe(true);
      
      // Verify welcome email was sent
      expect(mockedEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.first_name
      );
    });

    it('should return error for invalid token', async () => {
      mockedEmailVerificationTokenModel.verifyAndDelete.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return error if user not found after token verification', async () => {
      mockedEmailVerificationTokenModel.verifyAndDelete.mockResolvedValue('user-id-123');
      mockedUserModel.verifyEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'valid-token' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should verify email successfully even if welcome email fails', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        email_verified: true,
        first_name: 'John'
      };

      mockedEmailVerificationTokenModel.verifyAndDelete.mockResolvedValue('user-id-123');
      mockedUserModel.verifyEmail.mockResolvedValue(mockUser as any);
      mockedEmailService.sendWelcomeEmail.mockRejectedValue(new Error('Email service error'));

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'valid-token' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Email verified successfully');
      expect(response.body.user.email_verified).toBe(true);
      
      // Verify welcome email was attempted
      expect(mockedEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.first_name
      );
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email for existing user', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        first_name: 'John'
      };

      const mockToken = {
        id: 'token-id-123',
        user_id: 'user-id-123',
        token: 'reset-token-123',
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        created_at: new Date()
      };

      mockedUserModel.findByEmail.mockResolvedValue(mockUser as any);
      mockedPasswordResetTokenModel.create.mockResolvedValue(mockToken);
      mockedEmailService.sendPasswordResetEmail.mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('password reset link has been sent');

      expect(mockedPasswordResetTokenModel.create).toHaveBeenCalledWith(mockUser.id);
      expect(mockedEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockToken.token,
        mockUser.first_name
      );
    });

    it('should return success message even for non-existent user (security)', async () => {
      mockedUserModel.findByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('password reset link has been sent');
      expect(mockedPasswordResetTokenModel.create).not.toHaveBeenCalled();
    });

    it('should return error if email sending fails', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        first_name: 'John'
      };

      const mockToken = {
        id: 'token-id-123',
        user_id: 'user-id-123',
        token: 'reset-token-123',
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        created_at: new Date()
      };

      mockedUserModel.findByEmail.mockResolvedValue(mockUser as any);
      mockedPasswordResetTokenModel.create.mockResolvedValue(mockToken);
      mockedEmailService.sendPasswordResetEmail.mockRejectedValue(new Error('Email service error'));

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('EMAIL_SEND_FAILED');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password successfully', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com'
      };

      mockedPasswordResetTokenModel.verifyAndDelete.mockResolvedValue('user-id-123');
      mockedUserModel.updatePassword.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          password: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Password reset successfully');

      expect(mockedPasswordResetTokenModel.verifyAndDelete).toHaveBeenCalledWith('valid-reset-token');
      expect(mockedUserModel.updatePassword).toHaveBeenCalledWith('user-id-123', 'newpassword123');
    });

    it('should return error for invalid reset token', async () => {
      mockedPasswordResetTokenModel.verifyAndDelete.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'newpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return validation error for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-token',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile for authenticated user', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        balance: 100,
        email_verified: true
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer valid-jwt-token`);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(mockUser.email);
      expect(response.body.user.password_hash).toBeUndefined();
    });

    it('should return error for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return error for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        role: 'user'
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer valid-jwt-token`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Logged out successfully');
    });
  });
});