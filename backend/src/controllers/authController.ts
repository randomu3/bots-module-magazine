import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { EmailVerificationTokenModel } from '../models/EmailVerificationToken';
import { PasswordResetTokenModel } from '../models/PasswordResetToken';
import { 
  createUserSchema, 
  loginSchema, 
  emailVerificationSchema,
  passwordResetRequestSchema,
  passwordResetSchema 
} from '../validation/schemas';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../services/emailService';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] || 'your-refresh-secret-key';

interface AuthRequest extends Request {
  user?: any;
}

export class AuthController {
  // Generate JWT tokens
  private static generateTokens(userId: string, email: string, role: string) {
    const accessToken = jwt.sign(
      { userId, email, role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, email, role },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  // Register new user
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const { error, value } = createUserSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid input',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { email, password, first_name, last_name, referred_by } = value;

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        res.status(409).json({
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Create user
      const user = await UserModel.create({
        email,
        password,
        first_name,
        last_name,
        referred_by
      });

      // Generate email verification token
      const verificationToken = await EmailVerificationTokenModel.create(user.id);

      // Send verification email
      try {
        await sendVerificationEmail(user.email, verificationToken.token, user.first_name);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Continue with registration even if email fails
      }

      // Return success response (without password hash)
      const { password_hash, ...userResponse } = user;
      res.status(201).json({
        message: 'User registered successfully. Please check your email for verification.',
        user: userResponse,
        verification_required: true
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.message === 'Email already exists') {
        res.status(409).json({
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to register user',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Login user
  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid input',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { email, password } = value;

      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Verify password
      const isValidPassword = await UserModel.verifyPassword(user, password);
      if (!isValidPassword) {
        res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Generate tokens
      const { accessToken, refreshToken } = AuthController.generateTokens(
        user.id,
        user.email,
        user.role
      );

      // Return success response (without password hash)
      const { password_hash, ...userResponse } = user;
      res.json({
        message: 'Login successful',
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken
        }
      });

    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to login',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Refresh access token
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      
      // Find user to ensure they still exist
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        res.status(401).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Generate new tokens
      const tokens = AuthController.generateTokens(user.id, user.email, user.role);

      res.json({
        message: 'Token refreshed successfully',
        tokens
      });

    } catch (error: any) {
      console.error('Token refresh error:', error);
      
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        res.status(401).json({
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to refresh token',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Verify email
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const { error, value } = emailVerificationSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid input',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { token } = value;

      // Verify token and get user ID
      const userId = await EmailVerificationTokenModel.verifyAndDelete(token);
      if (!userId) {
        res.status(400).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired verification token',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Update user email verification status
      const user = await UserModel.verifyEmail(userId);
      if (!user) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Send welcome email after successful verification
      try {
        await sendWelcomeEmail(user.email, user.first_name);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Continue with verification success even if welcome email fails
      }

      // Return success response (without password hash)
      const { password_hash, ...userResponse } = user;
      res.json({
        message: 'Email verified successfully',
        user: userResponse
      });

    } catch (error: any) {
      console.error('Email verification error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify email',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Request password reset
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const { error, value } = passwordResetRequestSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid input',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { email } = value;

      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        res.json({
          message: 'If an account with this email exists, a password reset link has been sent.'
        });
        return;
      }

      // Generate password reset token
      const resetToken = await PasswordResetTokenModel.create(user.id);

      // Send password reset email
      try {
        await sendPasswordResetEmail(user.email, resetToken.token, user.first_name);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        res.status(500).json({
          error: {
            code: 'EMAIL_SEND_FAILED',
            message: 'Failed to send password reset email',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        message: 'If an account with this email exists, a password reset link has been sent.'
      });

    } catch (error: any) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process password reset request',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Reset password
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const { error, value } = passwordResetSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid input',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { token, password } = value;

      // Verify token and get user ID
      const userId = await PasswordResetTokenModel.verifyAndDelete(token);
      if (!userId) {
        res.status(400).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired reset token',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Update user password
      const user = await UserModel.updatePassword(userId, password);
      if (!user) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        message: 'Password reset successfully'
      });

    } catch (error: any) {
      console.error('Password reset error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reset password',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Get current user profile
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Return user profile (without password hash)
      const { password_hash, ...userResponse } = user;
      res.json({
        user: userResponse
      });

    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user profile',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Logout (client-side token removal, but we can blacklist tokens if needed)
  static async logout(_req: Request, res: Response): Promise<void> {
    // For now, just return success - client should remove tokens
    // In the future, we could implement token blacklisting with Redis
    res.json({
      message: 'Logged out successfully'
    });
  }
}