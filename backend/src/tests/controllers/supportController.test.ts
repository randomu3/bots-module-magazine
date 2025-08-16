import request from 'supertest';
import express from 'express';
import { SupportController } from '../../controllers/supportController';
import { SupportService } from '../../services/supportService';
import { authenticateToken } from '../../middleware/authMiddleware';

// Mock dependencies
jest.mock('../../services/supportService');
jest.mock('../../middleware/authMiddleware', () => ({
  authenticateToken: jest.fn()
}));

const mockSupportService = SupportService as jest.Mocked<typeof SupportService>;
const mockAuthMiddleware = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

// Create test app
const app = express();
app.use(express.json());

// Mock auth middleware to add user to request
mockAuthMiddleware.mockImplementation((req: any, _res, next) => {
  req.user = { id: 'user-1', role: 'user' };
  next();
});

// Setup routes
app.post('/tickets', authenticateToken, SupportController.createTicket);
app.get('/tickets/my', authenticateToken, SupportController.getUserTickets);
app.get('/tickets/:id', authenticateToken, SupportController.getTicket);
app.get('/tickets', authenticateToken, SupportController.listTickets);
app.put('/tickets/:id/status', authenticateToken, SupportController.updateTicketStatus);
app.put('/tickets/:id', authenticateToken, SupportController.updateTicket);
app.delete('/tickets/:id', authenticateToken, SupportController.deleteTicket);
app.get('/stats', authenticateToken, SupportController.getTicketStats);
app.get('/attention', authenticateToken, SupportController.getTicketsRequiringAttention);

describe('SupportController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /tickets', () => {
    const mockTicket = {
      id: 'ticket-1',
      user_id: 'user-1',
      subject: 'Test Issue',
      message: 'Test message',
      status: 'open',
      priority: 'normal',
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should create a support ticket successfully', async () => {
      mockSupportService.createTicket.mockResolvedValue(mockTicket);

      const response = await request(app)
        .post('/tickets')
        .send({
          subject: 'Test Issue',
          message: 'Test message',
          priority: 'normal'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: mockTicket,
        message: 'Support ticket created successfully'
      });
      expect(mockSupportService.createTicket).toHaveBeenCalledWith({
        user_id: 'user-1',
        subject: 'Test Issue',
        message: 'Test message',
        priority: 'normal'
      });
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/tickets')
        .send({
          subject: '', // Invalid: empty subject
          message: 'Test message'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for unauthenticated request', async () => {
      mockAuthMiddleware.mockImplementationOnce((req: any, res, _next) => {
        req.user = null;
        res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
      });

      const response = await request(app)
        .post('/tickets')
        .send({
          subject: 'Test Issue',
          message: 'Test message'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /tickets/my', () => {
    it('should return user tickets', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          user_id: 'user-1',
          subject: 'Test Issue',
          status: 'open',
          priority: 'normal'
        }
      ];

      mockSupportService.getTicketsByUserId.mockResolvedValue(mockTickets as any);

      const response = await request(app).get('/tickets/my');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockTickets
      });
      expect(mockSupportService.getTicketsByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GET /tickets/:id', () => {
    const mockTicket = {
      id: 'ticket-1',
      user_id: 'user-1',
      subject: 'Test Issue',
      status: 'open',
      priority: 'normal'
    };

    it('should return ticket for owner', async () => {
      mockSupportService.getTicketById.mockResolvedValue(mockTicket as any);

      const response = await request(app).get('/tickets/ticket-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockTicket
      });
    });

    it('should return 403 for non-owner', async () => {
      const otherUserTicket = { ...mockTicket, user_id: 'other-user' };
      mockSupportService.getTicketById.mockResolvedValue(otherUserTicket as any);

      const response = await request(app).get('/tickets/ticket-1');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should return 404 for non-existent ticket', async () => {
      mockSupportService.getTicketById.mockResolvedValue(null);

      const response = await request(app).get('/tickets/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
    });
  });

  describe('PUT /tickets/:id/status (Admin only)', () => {
    beforeEach(() => {
      // Mock admin user
      mockAuthMiddleware.mockImplementation((req: any, _res, next) => {
        req.user = { id: 'admin-1', role: 'admin' };
        next();
      });
    });

    it('should update ticket status as admin', async () => {
      const updatedTicket = {
        id: 'ticket-1',
        user_id: 'user-1',
        subject: 'Test Issue',
        status: 'resolved',
        priority: 'normal'
      };

      mockSupportService.updateTicketStatus.mockResolvedValue(updatedTicket as any);

      const response = await request(app)
        .put('/tickets/ticket-1/status')
        .send({ status: 'resolved' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: updatedTicket,
        message: 'Ticket status updated successfully'
      });
      expect(mockSupportService.updateTicketStatus).toHaveBeenCalledWith('ticket-1', 'resolved', 'admin-1');
    });

    it('should return 403 for non-admin user', async () => {
      mockAuthMiddleware.mockImplementationOnce((req: any, _res, next) => {
        req.user = { id: 'user-1', role: 'user' };
        next();
      });

      const response = await request(app)
        .put('/tickets/ticket-1/status')
        .send({ status: 'resolved' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put('/tickets/ticket-1/status')
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /tickets (Admin only)', () => {
    beforeEach(() => {
      // Mock admin user
      mockAuthMiddleware.mockImplementation((req: any, _res, next) => {
        req.user = { id: 'admin-1', role: 'admin' };
        next();
      });
    });

    it('should list all tickets for admin', async () => {
      const mockResult = {
        tickets: [
          {
            id: 'ticket-1',
            user_id: 'user-1',
            subject: 'Test Issue',
            status: 'open'
          }
        ],
        total: 1
      };

      mockSupportService.listTickets.mockResolvedValue(mockResult as any);

      const response = await request(app).get('/tickets?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockResult.tickets,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1
        }
      });
    });

    it('should return 403 for non-admin user', async () => {
      mockAuthMiddleware.mockImplementationOnce((req: any, _res, next) => {
        req.user = { id: 'user-1', role: 'user' };
        next();
      });

      const response = await request(app).get('/tickets');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('GET /stats (Admin only)', () => {
    beforeEach(() => {
      // Mock admin user
      mockAuthMiddleware.mockImplementation((req: any, _res, next) => {
        req.user = { id: 'admin-1', role: 'admin' };
        next();
      });
    });

    it('should return ticket statistics for admin', async () => {
      const mockStats = {
        total_tickets: 100,
        open_tickets: 20,
        in_progress_tickets: 15,
        resolved_tickets: 50,
        closed_tickets: 15
      };

      mockSupportService.getTicketStats.mockResolvedValue(mockStats);

      const response = await request(app).get('/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockStats
      });
    });

    it('should return 403 for non-admin user', async () => {
      mockAuthMiddleware.mockImplementationOnce((req: any, _res, next) => {
        req.user = { id: 'user-1', role: 'user' };
        next();
      });

      const response = await request(app).get('/stats');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('DELETE /tickets/:id (Admin only)', () => {
    beforeEach(() => {
      // Mock admin user
      mockAuthMiddleware.mockImplementation((req: any, _res, next) => {
        req.user = { id: 'admin-1', role: 'admin' };
        next();
      });
    });

    it('should delete ticket as admin', async () => {
      mockSupportService.deleteTicket.mockResolvedValue(true);

      const response = await request(app).delete('/tickets/ticket-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Ticket deleted successfully'
      });
      expect(mockSupportService.deleteTicket).toHaveBeenCalledWith('ticket-1');
    });

    it('should return 404 for non-existent ticket', async () => {
      mockSupportService.deleteTicket.mockResolvedValue(false);

      const response = await request(app).delete('/tickets/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
    });
  });
});