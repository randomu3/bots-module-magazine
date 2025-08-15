import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken, rateLimit } from '../middleware/authMiddleware';

const router = Router();

// Rate limiting for auth endpoints
const authRateLimit = rateLimit(5, 15 * 60 * 1000); // 5 requests per 15 minutes
const generalRateLimit = rateLimit(10, 60 * 1000); // 10 requests per minute

// Public routes
router.post('/register', authRateLimit, AuthController.register);
router.post('/login', authRateLimit, AuthController.login);
router.post('/refresh-token', generalRateLimit, AuthController.refreshToken);
router.post('/verify-email', generalRateLimit, AuthController.verifyEmail);
router.post('/forgot-password', authRateLimit, AuthController.requestPasswordReset);
router.post('/reset-password', authRateLimit, AuthController.resetPassword);

// Protected routes
router.get('/profile', authenticateToken, AuthController.getProfile);
router.post('/logout', authenticateToken, AuthController.logout);

export default router;