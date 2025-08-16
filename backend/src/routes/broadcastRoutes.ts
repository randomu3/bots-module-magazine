import { Router } from 'express';
import { BroadcastController } from '../controllers/broadcastController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Broadcast campaign management
router.post('/', BroadcastController.createBroadcast);
router.get('/', BroadcastController.getUserBroadcasts);
router.post('/:id/execute', BroadcastController.executeBroadcast);
router.post('/:id/cancel', BroadcastController.cancelBroadcast);

// Broadcast analytics and reporting
router.get('/:id/stats', BroadcastController.getBroadcastStats);
router.get('/:id/report', BroadcastController.getBroadcastReport);

// Utilities
router.post('/validate-targets', BroadcastController.validateTargets);
router.post('/estimate-cost', BroadcastController.estimateCost);
router.get('/templates', BroadcastController.getTemplates);

export default router;