import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Dashboard
router.get('/dashboard/stats', AdminController.getDashboardStats);

// Users Management
router.get('/users', AdminController.getUsers);
router.put('/users/:userId/status', AdminController.updateUserStatus);
router.put('/users/:userId/balance', AdminController.updateUserBalance);

// Bots Management
router.get('/bots', AdminController.getBots);
router.put('/bots/:botId/status', AdminController.updateBotStatus);

// Modules Management
router.get('/modules', AdminController.getModules);
router.put('/modules/:moduleId/status', AdminController.updateModuleStatus);

// Withdrawals Management
router.get('/withdrawals', AdminController.getWithdrawals);
router.put('/withdrawals/:withdrawalId/process', AdminController.processWithdrawal);

// Support Tickets Management
router.get('/tickets', AdminController.getTickets);
router.put('/tickets/:ticketId/status', AdminController.updateTicketStatus);
router.put('/tickets/:ticketId/assign', AdminController.assignTicket);

export default router;