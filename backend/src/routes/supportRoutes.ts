import { Router } from 'express';
import { SupportController } from '../controllers/supportController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// User routes - accessible by authenticated users
router.post('/tickets', SupportController.createTicket);
router.get('/tickets/my', SupportController.getUserTickets);
router.get('/tickets/:id', SupportController.getTicket);

// Admin routes - accessible by administrators only
router.get('/tickets', SupportController.listTickets);
router.put('/tickets/:id/status', SupportController.updateTicketStatus);
router.put('/tickets/:id', SupportController.updateTicket);
router.delete('/tickets/:id', SupportController.deleteTicket);
router.get('/stats', SupportController.getTicketStats);
router.get('/attention', SupportController.getTicketsRequiringAttention);

export default router;