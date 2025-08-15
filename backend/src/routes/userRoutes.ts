import { Router } from 'express';
import { UserController, upload } from '../controllers/userController';
import { authenticateToken, rateLimit } from '../middleware/authMiddleware';

const router = Router();

// Rate limiting for user endpoints
const generalRateLimit = rateLimit(30, 60 * 1000); // 30 requests per minute
const uploadRateLimit = rateLimit(5, 60 * 1000); // 5 uploads per minute

// All user routes require authentication
router.use(authenticateToken);

// Profile management routes
router.get('/profile', generalRateLimit, UserController.getProfile);
router.put('/profile', generalRateLimit, UserController.updateProfile);

// Avatar management routes
router.post('/avatar', uploadRateLimit, upload.single('avatar'), UserController.uploadAvatar);
router.delete('/avatar', generalRateLimit, UserController.deleteAvatar);

// Balance management routes
router.get('/balance', generalRateLimit, UserController.getBalance);
router.post('/balance/add', generalRateLimit, UserController.addFunds);
router.post('/balance/deduct', generalRateLimit, UserController.deductFunds);
router.get('/balance/history', generalRateLimit, UserController.getBalanceHistory);

export default router;