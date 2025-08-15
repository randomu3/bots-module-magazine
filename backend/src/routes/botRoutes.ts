import { Router } from 'express';
import { BotController } from '../controllers/botController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication middleware to all bot routes
router.use(authenticateToken);

// Bot connection and management routes
router.post('/connect', BotController.connectBot);
router.get('/list', BotController.getBotsList);
router.get('/:id', BotController.getBotById);
router.put('/:id/settings', BotController.updateBotSettings);
router.delete('/:id', BotController.deleteBot);
router.get('/:id/status', BotController.checkBotStatus);

export default router;