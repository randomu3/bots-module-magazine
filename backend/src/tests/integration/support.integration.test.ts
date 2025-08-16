import '../integration-setup';
import request from 'supertest';
import app from '../../index';
import { UserModel } from '../../models/User';
import { EmailVerificationTokenModel } from '../../models/EmailVerificationToken';
import { SupportService } from '../../services/supportService';
import { EmailService } from '../../services/emailService';

// Mock services
jest.mock('../../services/supportService');
jest.mock('../../services/emailService');

const mockSupportService = SupportService as jest.Mocked<typeof SupportService>;
const mockEmailService = EmailService as jest.Mocked<typeof EmailService>;

describe('Support System Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let adminToken: string;
  let adminUserId: string;
  let ticketId: string;

  beforeAll(async () => {
    // Create regular test user
    const userData = {
      email: `supporttest-${Date.now()}@example.com`,
      password: 'testpassword123',
      first_name: 'Support',
      last_name: 'Tester'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    userId = registerResponse.body.user.id;

    // Verify email
    const verificationTokens = await EmailVerificationTokenModel.findByUserId(userId);
    await request(app)
      .post('/api/auth/verify-email')
      .send({ token: verificationTokens[0]?.token });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    authToken = loginResponse.body.tokens.accessToken;

    // Create admin user
    const adminData = {
      email: `admin-support-${Date.now()}@example.com`,
      password: 'adminpassword123',
      first_name: 'Admin',
      last_name: 'Support',
      role: 'admin'
    };

    const adminRegisterResponse = await request(app)
      .post('/api/auth/register')
      .send(adminData);

    adminUserId = adminRegisterResponse.body.user.id;

    // Verify admin email
    const adminVerificationTokens = await EmailVerificationTokenModel.findByUserId(adminUserId);
    await request(app)
      .post('/api/auth/verify-email')
      .send({ token: adminVerificationTokens[0]?.token });

    // Login admin
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminData.email,
        password: adminData.password
      });

    adminToken = adminLoginResponse.body.tokens.accessToken;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);
    mockEmailService.verifyEmailConfig.mockResolvedValue(true);
    mockEmailService.sendSupportTicketConfirmation.mockResolvedValue(undefined);
    mockEmailService.sendSupportTicketUpdate.mockResolvedValue(undefined);
  });

  describe('Support Ticket Management', () => {
    describe('POST /api/support/tickets', () => {
      it('should create support ticket successfully', async () => {
        const mockTicket = {
          id: 'ticket-123',
          user_id: userId,
          subject: 'Bot connection issue',
          description: 'I cannot connect my Telegram bot',
          category: 'technical',
          priority: 'medium',
          status: 'open',
          created_at: new Date()
        };

        mockSupportService.createTicket.mockResolvedValueOnce(mockTicket);

        const response = await request(app)
          .post('/api/support/tickets')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            subject: 'Bot connection issue',
            description: 'I cannot connect my Telegram bot. It shows an invalid token error.',
            category: 'technical',
            priority: 'medium',
            attachments: [
              {
                filename: 'error_screenshot.png',
                url: 'https://example.com/uploads/error_screenshot.png'
              }
            ]
          });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          message: 'Support ticket created successfully',
          ticket: {
            id: 'ticket-123',
            subject: 'Bot connection issue',
            status: 'open',
            priority: 'medium'
          }
        });

        ticketId = response.body.ticket.id;

        expect(mockSupportService.createTicket).toHaveBeenCalledWith({
          user_id: userId,
          subject: 'Bot connection issue',
          description: 'I cannot connect my Telegram bot. It shows an invalid token error.',
          category: 'technical',
          priority: 'medium',
          attachments: expect.any(Array)
        });

        expect(mockEmailService.sendSupportTicketConfirmation).toHaveBeenCalled();
      });

      it('should validate ticket creation data', async () => {
        const response = await request(app)
          .post('/api/support/tickets')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            subject: '', // Empty subject
            description: 'Test description',
            category: 'technical'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/support/tickets')
          .send({
            subject: 'Test ticket',
            description: 'Test description',
            category: 'technical'
          });

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('AUTH_REQUIRED');
      });

      it('should auto-assign priority for critical issues', async () => {
        const mockCriticalTicket = {
          id: 'ticket-critical-123',
          user_id: userId,
          subject: 'Payment not processed',
          description: 'My payment was charged but module not activated',
          category: 'billing',
          priority: 'critical',
          status: 'open',
          created_at: new Date()
        };

        mockSupportService.createTicket.mockResolvedValueOnce(mockCriticalTicket);

        const response = await request(app)
          .post('/api/support/tickets')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            subject: 'Payment not processed',
            description: 'My payment was charged but module not activated',
            category: 'billing'
          });

        expect(response.status).toBe(201);
        expect(response.body.ticket.priority).toBe('critical');
      });
    });

    describe('GET /api/support/tickets', () => {
      it('should get user support tickets', async () => {
        const response = await request(app)
          .get('/api/support/tickets')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('tickets');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body).toHaveProperty('statistics');
        expect(Array.isArray(response.body.tickets)).toBe(true);
      });

      it('should filter tickets by status', async () => {
        const response = await request(app)
          .get('/api/support/tickets?status=open')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.tickets).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              status: 'open'
            })
          ])
        );
      });

      it('should filter tickets by category', async () => {
        const response = await request(app)
          .get('/api/support/tickets?category=technical')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.tickets).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              category: 'technical'
            })
          ])
        );
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/support/tickets?page=1&limit=10')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.pagination).toMatchObject({
          page: 1,
          limit: 10,
          total: expect.any(Number),
          pages: expect.any(Number)
        });
      });
    });

    describe('GET /api/support/tickets/:id', () => {
      it('should get ticket details', async () => {
        const mockTicketDetails = {
          id: 'ticket-123',
          user_id: userId,
          subject: 'Bot connection issue',
          description: 'I cannot connect my Telegram bot',
          category: 'technical',
          priority: 'medium',
          status: 'open',
          messages: [
            {
              id: 'msg-1',
              sender_type: 'user',
              sender_id: userId,
              message: 'I cannot connect my Telegram bot',
              created_at: new Date()
            }
          ],
          attachments: [],
          created_at: new Date(),
          updated_at: new Date()
        };

        mockSupportService.getTicketById.mockResolvedValueOnce(mockTicketDetails);

        const response = await request(app)
          .get('/api/support/tickets/ticket-123')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.ticket).toMatchObject({
          id: 'ticket-123',
          subject: 'Bot connection issue',
          status: 'open'
        });
        expect(response.body.ticket).toHaveProperty('messages');
        expect(Array.isArray(response.body.ticket.messages)).toBe(true);
      });

      it('should return 404 for non-existent ticket', async () => {
        mockSupportService.getTicketById.mockRejectedValueOnce(
          new Error('Ticket not found')
        );

        const response = await request(app)
          .get('/api/support/tickets/non-existent')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
      });

      it('should prevent access to other users tickets', async () => {
        mockSupportService.getTicketById.mockRejectedValueOnce(
          new Error('Access denied')
        );

        const response = await request(app)
          .get('/api/support/tickets/other-user-ticket')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('ACCESS_DENIED');
      });
    });

    describe('POST /api/support/tickets/:id/messages', () => {
      it('should add message to ticket', async () => {
        const mockMessage = {
          id: 'msg-2',
          ticket_id: 'ticket-123',
          sender_type: 'user',
          sender_id: userId,
          message: 'I tried the suggested solution but it still does not work',
          created_at: new Date()
        };

        mockSupportService.addTicketMessage.mockResolvedValueOnce(mockMessage);

        const response = await request(app)
          .post('/api/support/tickets/ticket-123/messages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: 'I tried the suggested solution but it still does not work',
            attachments: [
              {
                filename: 'new_error.png',
                url: 'https://example.com/uploads/new_error.png'
              }
            ]
          });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          message: 'Message added successfully',
          ticket_message: {
            id: 'msg-2',
            message: 'I tried the suggested solution but it still does not work'
          }
        });

        expect(mockSupportService.addTicketMessage).toHaveBeenCalledWith({
          ticket_id: 'ticket-123',
          sender_type: 'user',
          sender_id: userId,
          message: 'I tried the suggested solution but it still does not work',
          attachments: expect.any(Array)
        });
      });

      it('should validate message content', async () => {
        const response = await request(app)
          .post('/api/support/tickets/ticket-123/messages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: '' // Empty message
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('PUT /api/support/tickets/:id/close', () => {
      it('should close ticket', async () => {
        mockSupportService.closeTicket.mockResolvedValueOnce({
          id: 'ticket-123',
          status: 'closed',
          closed_at: new Date(),
          closed_by: userId
        });

        const response = await request(app)
          .put('/api/support/tickets/ticket-123/close')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            reason: 'Issue resolved',
            satisfaction_rating: 5
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Ticket closed successfully');
        expect(response.body.ticket.status).toBe('closed');

        expect(mockSupportService.closeTicket).toHaveBeenCalledWith(
          'ticket-123',
          userId,
          {
            reason: 'Issue resolved',
            satisfaction_rating: 5
          }
        );
      });

      it('should prevent closing already closed ticket', async () => {
        mockSupportService.closeTicket.mockRejectedValueOnce(
          new Error('Ticket already closed')
        );

        const response = await request(app)
          .put('/api/support/tickets/ticket-123/close')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            reason: 'Issue resolved'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('TICKET_ALREADY_CLOSED');
      });
    });

    describe('PUT /api/support/tickets/:id/reopen', () => {
      it('should reopen closed ticket', async () => {
        mockSupportService.reopenTicket.mockResolvedValueOnce({
          id: 'ticket-123',
          status: 'open',
          reopened_at: new Date(),
          reopened_by: userId
        });

        const response = await request(app)
          .put('/api/support/tickets/ticket-123/reopen')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            reason: 'Issue not fully resolved'
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Ticket reopened successfully');
        expect(response.body.ticket.status).toBe('open');
      });
    });
  });

  describe('Admin Support Management', () => {
    describe('GET /api/support/admin/tickets', () => {
      it('should get all tickets for admin', async () => {
        const response = await request(app)
          .get('/api/support/admin/tickets')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('tickets');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body).toHaveProperty('statistics');
        expect(response.body).toHaveProperty('queue_metrics');
        expect(Array.isArray(response.body.tickets)).toBe(true);
      });

      it('should reject non-admin access', async () => {
        const response = await request(app)
          .get('/api/support/admin/tickets')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });

      it('should filter tickets by priority', async () => {
        const response = await request(app)
          .get('/api/support/admin/tickets?priority=critical')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.tickets).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              priority: 'critical'
            })
          ])
        );
      });

      it('should filter tickets by assigned agent', async () => {
        const response = await request(app)
          .get(`/api/support/admin/tickets?assigned_to=${adminUserId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.tickets).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              assigned_to: adminUserId
            })
          ])
        );
      });
    });

    describe('PUT /api/support/admin/tickets/:id/assign', () => {
      it('should assign ticket to agent', async () => {
        mockSupportService.assignTicket.mockResolvedValueOnce({
          id: 'ticket-123',
          assigned_to: adminUserId,
          assigned_at: new Date(),
          status: 'in_progress'
        });

        const response = await request(app)
          .put('/api/support/admin/tickets/ticket-123/assign')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            assigned_to: adminUserId,
            notes: 'Assigning to technical specialist'
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Ticket assigned successfully');
        expect(response.body.ticket.assigned_to).toBe(adminUserId);

        expect(mockSupportService.assignTicket).toHaveBeenCalledWith(
          'ticket-123',
          adminUserId,
          {
            notes: 'Assigning to technical specialist'
          }
        );
      });
    });

    describe('PUT /api/support/admin/tickets/:id/priority', () => {
      it('should update ticket priority', async () => {
        mockSupportService.updateTicketPriority.mockResolvedValueOnce({
          id: 'ticket-123',
          priority: 'high',
          priority_updated_at: new Date(),
          priority_updated_by: adminUserId
        });

        const response = await request(app)
          .put('/api/support/admin/tickets/ticket-123/priority')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            priority: 'high',
            reason: 'Customer is premium user'
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Ticket priority updated');
        expect(response.body.ticket.priority).toBe('high');
      });

      it('should validate priority value', async () => {
        const response = await request(app)
          .put('/api/support/admin/tickets/ticket-123/priority')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            priority: 'invalid_priority'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_PRIORITY');
      });
    });

    describe('POST /api/support/admin/tickets/:id/reply', () => {
      it('should reply to ticket as admin', async () => {
        const mockReply = {
          id: 'msg-admin-1',
          ticket_id: 'ticket-123',
          sender_type: 'admin',
          sender_id: adminUserId,
          message: 'Thank you for contacting support. Please try updating your bot token.',
          is_internal: false,
          created_at: new Date()
        };

        mockSupportService.addTicketMessage.mockResolvedValueOnce(mockReply);

        const response = await request(app)
          .post('/api/support/admin/tickets/ticket-123/reply')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            message: 'Thank you for contacting support. Please try updating your bot token.',
            is_internal: false,
            update_status: 'in_progress'
          });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Reply sent successfully');
        expect(response.body.ticket_message.sender_type).toBe('admin');

        expect(mockEmailService.sendSupportTicketUpdate).toHaveBeenCalled();
      });

      it('should add internal note', async () => {
        const mockInternalNote = {
          id: 'msg-internal-1',
          ticket_id: 'ticket-123',
          sender_type: 'admin',
          sender_id: adminUserId,
          message: 'User seems to have invalid bot token format',
          is_internal: true,
          created_at: new Date()
        };

        mockSupportService.addTicketMessage.mockResolvedValueOnce(mockInternalNote);

        const response = await request(app)
          .post('/api/support/admin/tickets/ticket-123/reply')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            message: 'User seems to have invalid bot token format',
            is_internal: true
          });

        expect(response.status).toBe(201);
        expect(response.body.ticket_message.is_internal).toBe(true);

        // Internal notes should not trigger email notifications
        expect(mockEmailService.sendSupportTicketUpdate).not.toHaveBeenCalled();
      });
    });
  });

  describe('Support Analytics', () => {
    describe('GET /api/support/analytics', () => {
      it('should get support analytics for admin', async () => {
        const response = await request(app)
          .get('/api/support/analytics')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('ticket_statistics');
        expect(response.body).toHaveProperty('response_times');
        expect(response.body).toHaveProperty('resolution_times');
        expect(response.body).toHaveProperty('satisfaction_scores');
        expect(response.body).toHaveProperty('agent_performance');
      });

      it('should filter analytics by date range', async () => {
        const response = await request(app)
          .get('/api/support/analytics?start_date=2024-01-01&end_date=2024-12-31')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('date_range');
        expect(response.body.date_range).toMatchObject({
          start: '2024-01-01',
          end: '2024-12-31'
        });
      });

      it('should get analytics by category', async () => {
        const response = await request(app)
          .get('/api/support/analytics?category=technical')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('category');
        expect(response.body.category).toBe('technical');
      });
    });

    describe('GET /api/support/analytics/performance', () => {
      it('should get agent performance metrics', async () => {
        const response = await request(app)
          .get('/api/support/analytics/performance')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('agent_metrics');
        expect(response.body).toHaveProperty('team_performance');
        expect(response.body).toHaveProperty('workload_distribution');
        expect(response.body).toHaveProperty('efficiency_scores');
      });
    });
  });

  describe('Knowledge Base', () => {
    describe('GET /api/support/knowledge-base', () => {
      it('should get knowledge base articles', async () => {
        const response = await request(app)
          .get('/api/support/knowledge-base')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('articles');
        expect(response.body).toHaveProperty('categories');
        expect(response.body).toHaveProperty('popular_articles');
        expect(Array.isArray(response.body.articles)).toBe(true);
      });

      it('should search knowledge base', async () => {
        const response = await request(app)
          .get('/api/support/knowledge-base?search=bot+connection')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('search_results');
        expect(response.body).toHaveProperty('search_query');
        expect(response.body.search_query).toBe('bot connection');
      });

      it('should filter by category', async () => {
        const response = await request(app)
          .get('/api/support/knowledge-base?category=getting-started')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.articles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              category: 'getting-started'
            })
          ])
        );
      });
    });

    describe('GET /api/support/knowledge-base/:id', () => {
      it('should get knowledge base article', async () => {
        const response = await request(app)
          .get('/api/support/knowledge-base/article-123')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('article');
        expect(response.body).toHaveProperty('related_articles');
        expect(response.body.article).toHaveProperty('title');
        expect(response.body.article).toHaveProperty('content');
        expect(response.body.article).toHaveProperty('helpful_votes');
      });

      it('should return 404 for non-existent article', async () => {
        const response = await request(app)
          .get('/api/support/knowledge-base/non-existent')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('ARTICLE_NOT_FOUND');
      });
    });

    describe('POST /api/support/knowledge-base/:id/helpful', () => {
      it('should mark article as helpful', async () => {
        const response = await request(app)
          .post('/api/support/knowledge-base/article-123/helpful')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            helpful: true
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Feedback recorded successfully');
      });

      it('should mark article as not helpful', async () => {
        const response = await request(app)
          .post('/api/support/knowledge-base/article-123/helpful')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            helpful: false,
            feedback: 'Information is outdated'
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Feedback recorded successfully');
      });
    });
  });

  describe('Support Feedback', () => {
    describe('POST /api/support/feedback', () => {
      it('should submit general support feedback', async () => {
        const response = await request(app)
          .post('/api/support/feedback')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'suggestion',
            subject: 'Improve response time',
            message: 'It would be great if support could respond faster to technical issues',
            rating: 4
          });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Feedback submitted successfully');
        expect(response.body).toHaveProperty('feedback_id');
      });

      it('should validate feedback data', async () => {
        const response = await request(app)
          .post('/api/support/feedback')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'invalid_type',
            message: 'Test feedback'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/support/feedback/my', () => {
      it('should get user feedback history', async () => {
        const response = await request(app)
          .get('/api/support/feedback/my')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('feedback');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.feedback)).toBe(true);
      });
    });
  });

  describe('Support Escalation', () => {
    describe('PUT /api/support/tickets/:id/escalate', () => {
      it('should escalate ticket to higher priority', async () => {
        mockSupportService.escalateTicket.mockResolvedValueOnce({
          id: 'ticket-123',
          priority: 'critical',
          escalated: true,
          escalated_at: new Date(),
          escalated_by: userId
        });

        const response = await request(app)
          .put('/api/support/tickets/ticket-123/escalate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            reason: 'Issue is blocking my business operations'
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Ticket escalated successfully');
        expect(response.body.ticket.priority).toBe('critical');
        expect(response.body.ticket.escalated).toBe(true);
      });

      it('should require escalation reason', async () => {
        const response = await request(app)
          .put('/api/support/tickets/ticket-123/escalate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('MISSING_ESCALATION_REASON');
      });
    });
  });

  describe('Support Automation', () => {
    describe('POST /api/support/auto-reply', () => {
      it('should trigger auto-reply for common issues', async () => {
        const response = await request(app)
          .post('/api/support/auto-reply')
          .send({
            ticket_id: 'ticket-123',
            message: 'How do I connect my Telegram bot?',
            user_id: userId
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('auto_reply_sent');
        expect(response.body).toHaveProperty('suggested_articles');
        expect(response.body.auto_reply_sent).toBe(true);
      });

      it('should not auto-reply for complex issues', async () => {
        const response = await request(app)
          .post('/api/support/auto-reply')
          .send({
            ticket_id: 'ticket-123',
            message: 'My custom module integration is not working with the webhook system',
            user_id: userId
          });

        expect(response.status).toBe(200);
        expect(response.body.auto_reply_sent).toBe(false);
        expect(response.body).toHaveProperty('requires_human_review');
        expect(response.body.requires_human_review).toBe(true);
      });
    });
  });
});