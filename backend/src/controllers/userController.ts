import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { TransactionModel } from '../models/Transaction';
import { updateUserSchema, transactionFilterSchema } from '../validation/schemas';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${Date.now()}${ext}`);
  }
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

export class UserController {
  // Get user profile
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const user = await UserModel.findById(userId);
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

      // Remove sensitive data
      const { password_hash, ...userProfile } = user;

      res.json({
        success: true,
        data: userProfile
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Update user profile
  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Validate input
      const { error, value } = updateUserSchema.validate(req.body);
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

      const updatedUser = await UserModel.update(userId, value);
      if (!updatedUser) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Remove sensitive data
      const { password_hash, ...userProfile } = updatedUser;

      res.json({
        success: true,
        data: userProfile,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Upload avatar
  static async uploadAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          error: {
            code: 'NO_FILE_UPLOADED',
            message: 'No file uploaded',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get current user to check for existing avatar
      const currentUser = await UserModel.findById(userId);
      if (!currentUser) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Delete old avatar if exists
      if (currentUser.avatar_url) {
        const oldAvatarPath = path.join(process.cwd(), 'uploads', 'avatars', path.basename(currentUser.avatar_url));
        try {
          await fs.unlink(oldAvatarPath);
        } catch (error) {
          // Ignore error if file doesn't exist
          console.warn('Could not delete old avatar:', error);
        }
      }

      // Update user with new avatar URL
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const updatedUser = await UserModel.update(userId, { avatar_url: avatarUrl });

      if (!updatedUser) {
        res.status(500).json({
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update user avatar',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          avatar_url: avatarUrl
        },
        message: 'Avatar uploaded successfully'
      });
    } catch (error) {
      console.error('Upload avatar error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Delete avatar
  static async deleteAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const currentUser = await UserModel.findById(userId);
      if (!currentUser) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!currentUser.avatar_url) {
        res.status(400).json({
          error: {
            code: 'NO_AVATAR',
            message: 'User has no avatar to delete',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Delete avatar file
      const avatarPath = path.join(process.cwd(), 'uploads', 'avatars', path.basename(currentUser.avatar_url));
      try {
        await fs.unlink(avatarPath);
      } catch (error) {
        console.warn('Could not delete avatar file:', error);
      }

      // Update user to remove avatar URL
      await UserModel.update(userId, { avatar_url: null });

      res.json({
        success: true,
        message: 'Avatar deleted successfully'
      });
    } catch (error) {
      console.error('Delete avatar error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Get user balance
  static async getBalance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const user = await UserModel.findById(userId);
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
        success: true,
        data: {
          balance: user.balance,
          currency: 'USD'
        }
      });
    } catch (error) {
      console.error('Get balance error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Add funds to user balance
  static async addFunds(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { amount, description } = req.body;

      // Validate amount
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be a positive number',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Update user balance
      const updatedUser = await UserModel.updateBalance(userId, amount);
      if (!updatedUser) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Create transaction record
      await TransactionModel.create({
        user_id: userId,
        type: 'payment',
        amount: amount,
        currency: 'USD',
        description: description || 'Balance top-up',
        metadata: {
          source: 'manual_add_funds'
        }
      });

      res.json({
        success: true,
        data: {
          balance: updatedUser.balance,
          amount_added: amount
        },
        message: 'Funds added successfully'
      });
    } catch (error) {
      console.error('Add funds error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Deduct funds from user balance
  static async deductFunds(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { amount, description } = req.body;

      // Validate amount
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be a positive number',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check current balance
      const user = await UserModel.findById(userId);
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

      if (user.balance < amount) {
        res.status(400).json({
          error: {
            code: 'INSUFFICIENT_BALANCE',
            message: 'Insufficient balance',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Update user balance (deduct)
      const updatedUser = await UserModel.updateBalance(userId, -amount);
      if (!updatedUser) {
        res.status(500).json({
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update balance',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Create transaction record
      await TransactionModel.create({
        user_id: userId,
        type: 'withdrawal',
        amount: amount,
        currency: 'USD',
        description: description || 'Balance deduction',
        metadata: {
          source: 'manual_deduct_funds'
        }
      });

      res.json({
        success: true,
        data: {
          balance: updatedUser.balance,
          amount_deducted: amount
        },
        message: 'Funds deducted successfully'
      });
    } catch (error) {
      console.error('Deduct funds error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Get balance history (transactions)
  static async getBalanceHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Validate query parameters
      const { error, value } = transactionFilterSchema.validate(req.query);
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0]?.message || 'Invalid query parameters',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const filters = { ...value, user_id: userId };
      const result = await TransactionModel.list(filters);

      res.json({
        success: true,
        data: {
          transactions: result.transactions,
          pagination: {
            total: result.total,
            page: filters.page,
            limit: filters.limit,
            pages: Math.ceil(result.total / filters.limit)
          }
        }
      });
    } catch (error) {
      console.error('Get balance history error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}