import request from 'supertest';
import app from '../../index';
import { UserModel } from '../../models/User';
import fs from 'fs/promises';

// JWT is mocked in setup.ts

// Mock the UserModel
jest.mock('../../models/User');
const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;

// Mock fs for file operations
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('User Controller', () => {
  let authToken: string;
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    first_name: 'John',
    last_name: 'Doe',
    role: 'user' as const,
    balance: 100.50,
    referral_code: 'REF123',
    email_verified: true,
    theme_preference: 'light' as const,
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    // Generate auth token
    authToken = 'mocked-jwt-token';

    // Reset mocks
    jest.clearAllMocks();
    
    // Mock fs operations to avoid file system operations
    jest.spyOn(fs, 'unlink').mockResolvedValue();
    jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
  });

  describe('GET /api/users/profile', () => {
    it('should return user profile successfully', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          id: mockUser.id,
          email: mockUser.email,
          first_name: mockUser.first_name,
          last_name: mockUser.last_name,
          role: mockUser.role,
          balance: mockUser.balance,
          referral_code: mockUser.referral_code,
          email_verified: mockUser.email_verified,
          theme_preference: mockUser.theme_preference,
          created_at: mockUser.created_at.toISOString(),
          updated_at: mockUser.updated_at.toISOString()
        }
      });

      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return 404 if user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should handle database errors', async () => {
      mockUserModel.findById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('PUT /api/users/profile', () => {
    const updateData = {
      first_name: 'Jane',
      last_name: 'Smith',
      theme_preference: 'dark' as const
    };

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateData };
      mockUserModel.update.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          first_name: updateData.first_name,
          last_name: updateData.last_name,
          theme_preference: updateData.theme_preference
        }),
        message: 'Profile updated successfully'
      });

      expect(mockUserModel.update).toHaveBeenCalledWith(mockUser.id, updateData);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send(updateData)
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        first_name: '', // Empty name should be invalid
        theme_preference: 'invalid_theme'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if user not found', async () => {
      mockUserModel.update.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /api/users/avatar', () => {
    const mockFile = {
      filename: 'test-avatar.jpg',
      path: '/uploads/avatars/test-avatar.jpg'
    };

    beforeEach(() => {
      // Mock fs operations
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);
    });

    it('should upload avatar successfully', async () => {
      const updatedUser = { ...mockUser, avatar_url: `/uploads/avatars/${mockFile.filename}` };
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.update.mockResolvedValue(updatedUser);

      // Create a test image buffer
      const testImageBuffer = Buffer.from('fake-image-data');

      const response = await request(app)
        .post('/api/users/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', testImageBuffer, 'test.jpg')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          avatar_url: expect.stringContaining('/uploads/avatars/')
        },
        message: 'Avatar uploaded successfully'
      });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/users/avatar')
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return 400 without file', async () => {
      const response = await request(app)
        .post('/api/users/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('NO_FILE_UPLOADED');
    });
  });

  describe('DELETE /api/users/avatar', () => {
    it('should delete avatar successfully', async () => {
      const userWithAvatar = { ...mockUser, avatar_url: '/uploads/avatars/test.jpg' };
      mockUserModel.findById.mockResolvedValue(userWithAvatar);
      const updatedUserWithoutAvatar = { ...userWithAvatar };
      (updatedUserWithoutAvatar as any).avatar_url = undefined;
      mockUserModel.update.mockResolvedValue(updatedUserWithoutAvatar);

      const response = await request(app)
        .delete('/api/users/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Avatar deleted successfully'
      });

      expect(mockUserModel.update).toHaveBeenCalledWith(mockUser.id, { avatar_url: null });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .delete('/api/users/avatar')
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return 400 if user has no avatar', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser); // mockUser has no avatar

      const response = await request(app)
        .delete('/api/users/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('NO_AVATAR');
    });

    it('should return 404 if user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/users/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });
});