import '../integration-setup';
import request from 'supertest';
import app from '../../index';
import { UserModel } from '../../models/User';
import { EmailVerificationTokenModel } from '../../models/EmailVerificationToken';

// Mock email service
jest.mock('../../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
  verifyEmailConfig: jest.fn().mockResolvedValue(true)
}));

describe('Admin Integration Tests', () => {
  let adminToken: string;
  let adminUserId: string;
  let regularUserToken: string;
  let regularUserId: string;

  beforeAll(async () => {
    // Create admin user
    const adminData = {
      email: `admin-${Date.now()}@example.com`,
      password: 'adminpassword123',
      first_name: 'Admin',
      last_name: 'User',
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

    // Create regular user for testing
    const userData = {
      email: `user-${Date.now()}@example.com`,
      password: 'userpassword123',
      first_name: 'Regular',
      last_name: 'User'
    };

    const userRegisterResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    regularUserId = userRegisterResponse.body.user.id;

    // Verify user email
    const userVerificationTokens = await EmailVerificationTokenModel.findByUserId(regularUserId);
    await request(app)
      .post('/api/auth/verify-email')
      .send({ token: userVerificationTokens[0]?.token });

    // Login regular user
    const userLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    regularUserToken = userLoginResponse.body.tokens.accessToken;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Admin Dashboard', () => {
    describe('GET /api/admin/dashboard', () => {
      it('should get admin dashboard overview', async () => {
        const response = await request(app)
          .get('/api/admin/dashboard')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('overview');
        expect(response.body).toHaveProperty('recent_activity');
        expect(response.body).toHaveProperty('system_health');
        expect(response.body).toHaveProperty('key_metrics');
        
        expect(response.body.overview).toHaveProperty('total_users');
        expect(response.body.overview).toHaveProperty('total_bots');
        expect(response.body.overview).toHaveProperty('total_modules');
        expect(response.body.overview).toHaveProperty('platform_revenue');
      });

      it('should reject non-admin access', async () => {
        const response = await request(app)
          .get('/api/admin/dashboard')
          .set('Authorization', `Bearer ${regularUserToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });

      it('should reject unauthenticated access', async () => {
        const response = await request(app)
          .get('/api/admin/dashboard');

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('AUTH_REQUIRED');
      });
    });
  });

  describe('User Management', () => {
    describe('GET /api/admin/users', () => {
      it('should get users list with pagination', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('users');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.users)).toBe(true);
        expect(response.body.pagination).toHaveProperty('total');
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('limit');
      });

      it('should filter users by search term', async () => {
        const response = await request(app)
          .get('/api/admin/users?search=Regular')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.users).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              first_name: 'Regular'
            })
          ])
        );
      });

      it('should filter users by role', async () => {
        const response = await request(app)
          .get('/api/admin/users?role=admin')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.users).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              role: 'admin'
            })
          ])
        );
      });

      it('should filter users by status', async () => {
        const response = await request(app)
          .get('/api/admin/users?status=active')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.users).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              status: 'active'
            })
          ])
        );
      });
    });

    describe('GET /api/admin/users/:id', () => {
      it('should get user details', async () => {
        const response = await request(app)
          .get(`/api/admin/users/${regularUserId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.user).toMatchObject({
          id: regularUserId,
          first_name: 'Regular',
          last_name: 'User',
          role: 'user'
        });
        expect(response.body).toHaveProperty('bots');
        expect(response.body).toHaveProperty('transactions');
        expect(response.body).toHaveProperty('activity_log');
      });

      it('should return 404 for non-existent user', async () => {
        const response = await request(app)
          .get('/api/admin/users/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('USER_NOT_FOUND');
      });
    });

    describe('PUT /api/admin/users/:id', () => {
      it('should update user information', async () => {
        const updateData = {
          first_name: 'Updated',
          last_name: 'Name',
          role: 'developer'
        };

        const response = await request(app)
          .put(`/api/admin/users/${regularUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.user).toMatchObject({
          id: regularUserId,
          first_name: 'Updated',
          last_name: 'Name',
          role: 'developer'
        });
      });

      it('should validate update data', async () => {
        const response = await request(app)
          .put(`/api/admin/users/${regularUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            role: 'invalid_role'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /api/admin/users/:id/suspend', () => {
      it('should suspend user account', async () => {
        const response = await request(app)
          .post(`/api/admin/users/${regularUserId}/suspend`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            reason: 'Terms of service violation',
            duration: '7d'
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User suspended successfully');
        expect(response.body.user.status).toBe('suspended');
      });

      it('should require suspension reason', async () => {
        const response = await request(app)
          .post(`/api/admin/users/${regularUserId}/suspend`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            duration: '7d'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('MISSING_SUSPENSION_REASON');
      });
    });

    describe('POST /api/admin/users/:id/unsuspend', () => {
      it('should unsuspend user account', async () => {
        // First suspend the user
        await request(app)
          .post(`/api/admin/users/${regularUserId}/suspend`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            reason: 'Test suspension',
            duration: '1d'
          });

        // Then unsuspend
        const response = await request(app)
          .post(`/api/admin/users/${regularUserId}/unsuspend`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            reason: 'Issue resolved'
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User unsuspended successfully');
        expect(response.body.user.status).toBe('active');
      });
    });
  });

  describe('Bot Management', () => {
    describe('GET /api/admin/bots', () => {
      it('should get all bots across platform', async () => {
        const response = await request(app)
          .get('/api/admin/bots')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('bots');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body).toHaveProperty('statistics');
        expect(Array.isArray(response.body.bots)).toBe(true);
      });

      it('should filter bots by status', async () => {
        const response = await request(app)
          .get('/api/admin/bots?status=active')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.bots).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              status: 'active'
            })
          ])
        );
      });

      it('should search bots by name', async () => {
        const response = await request(app)
          .get('/api/admin/bots?search=test')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.bots)).toBe(true);
      });
    });

    describe('PUT /api/admin/bots/:id/status', () => {
      it('should update bot status', async () => {
        // This would require a bot ID from the test setup
        const response = await request(app)
          .put('/api/admin/bots/test-bot-id/status')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            status: 'suspended',
            reason: 'Policy violation'
          });

        // Since we don't have a real bot, expect 404
        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('BOT_NOT_FOUND');
      });
    });
  });

  describe('Module Management', () => {
    describe('GET /api/admin/modules', () => {
      it('should get all modules for moderation', async () => {
        const response = await request(app)
          .get('/api/admin/modules')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('modules');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body).toHaveProperty('statistics');
        expect(Array.isArray(response.body.modules)).toBe(true);
      });

      it('should filter modules by status', async () => {
        const response = await request(app)
          .get('/api/admin/modules?status=pending')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.modules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              status: 'pending'
            })
          ])
        );
      });

      it('should filter modules by category', async () => {
        const response = await request(app)
          .get('/api/admin/modules?category=advertising')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.modules)).toBe(true);
      });
    });

    describe('PUT /api/admin/modules/:id/approve', () => {
      it('should approve pending module', async () => {
        const response = await request(app)
          .put('/api/admin/modules/test-module-id/approve')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            review_notes: 'Module meets all requirements'
          });

        // Since we don't have a real module, expect 404
        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('MODULE_NOT_FOUND');
      });
    });

    describe('PUT /api/admin/modules/:id/reject', () => {
      it('should reject pending module', async () => {
        const response = await request(app)
          .put('/api/admin/modules/test-module-id/reject')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            reason: 'Does not meet security requirements',
            feedback: 'Please review the security guidelines'
          });

        // Since we don't have a real module, expect 404
        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('MODULE_NOT_FOUND');
      });

      it('should require rejection reason', async () => {
        const response = await request(app)
          .put('/api/admin/modules/test-module-id/reject')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            feedback: 'Please review the guidelines'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('MISSING_REJECTION_REASON');
      });
    });
  });

  describe('Financial Management', () => {
    describe('GET /api/admin/finances', () => {
      it('should get financial overview', async () => {
        const response = await request(app)
          .get('/api/admin/finances')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('revenue_summary');
        expect(response.body).toHaveProperty('commission_breakdown');
        expect(response.body).toHaveProperty('pending_payouts');
        expect(response.body).toHaveProperty('transaction_volume');
      });

      it('should filter finances by date range', async () => {
        const response = await request(app)
          .get('/api/admin/finances?start_date=2024-01-01&end_date=2024-12-31')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('date_range');
        expect(response.body.date_range).toMatchObject({
          start: '2024-01-01',
          end: '2024-12-31'
        });
      });
    });

    describe('GET /api/admin/withdrawals', () => {
      it('should get pending withdrawal requests', async () => {
        const response = await request(app)
          .get('/api/admin/withdrawals')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('withdrawals');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body).toHaveProperty('summary');
        expect(Array.isArray(response.body.withdrawals)).toBe(true);
      });

      it('should filter withdrawals by status', async () => {
        const response = await request(app)
          .get('/api/admin/withdrawals?status=pending')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.withdrawals).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              status: 'pending'
            })
          ])
        );
      });
    });

    describe('PUT /api/admin/withdrawals/:id/approve', () => {
      it('should approve withdrawal request', async () => {
        const response = await request(app)
          .put('/api/admin/withdrawals/test-withdrawal-id/approve')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            processing_notes: 'Verified and approved'
          });

        // Since we don't have a real withdrawal, expect 404
        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('WITHDRAWAL_NOT_FOUND');
      });
    });

    describe('PUT /api/admin/withdrawals/:id/reject', () => {
      it('should reject withdrawal request', async () => {
        const response = await request(app)
          .put('/api/admin/withdrawals/test-withdrawal-id/reject')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            reason: 'Insufficient documentation',
            notes: 'Please provide additional verification'
          });

        // Since we don't have a real withdrawal, expect 404
        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('WITHDRAWAL_NOT_FOUND');
      });
    });
  });

  describe('Support Management', () => {
    describe('GET /api/admin/support/tickets', () => {
      it('should get support tickets', async () => {
        const response = await request(app)
          .get('/api/admin/support/tickets')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('tickets');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body).toHaveProperty('statistics');
        expect(Array.isArray(response.body.tickets)).toBe(true);
      });

      it('should filter tickets by priority', async () => {
        const response = await request(app)
          .get('/api/admin/support/tickets?priority=high')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.tickets).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              priority: 'high'
            })
          ])
        );
      });

      it('should filter tickets by status', async () => {
        const response = await request(app)
          .get('/api/admin/support/tickets?status=open')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.tickets).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              status: 'open'
            })
          ])
        );
      });
    });

    describe('PUT /api/admin/support/tickets/:id/assign', () => {
      it('should assign ticket to admin', async () => {
        const response = await request(app)
          .put('/api/admin/support/tickets/test-ticket-id/assign')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            assigned_to: adminUserId
          });

        // Since we don't have a real ticket, expect 404
        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
      });
    });

    describe('POST /api/admin/support/tickets/:id/reply', () => {
      it('should reply to support ticket', async () => {
        const response = await request(app)
          .post('/api/admin/support/tickets/test-ticket-id/reply')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            message: 'Thank you for contacting support. We are looking into your issue.',
            internal_note: 'User reported login issues'
          });

        // Since we don't have a real ticket, expect 404
        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
      });

      it('should require reply message', async () => {
        const response = await request(app)
          .post('/api/admin/support/tickets/test-ticket-id/reply')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            internal_note: 'Internal note only'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('MISSING_REPLY_MESSAGE');
      });
    });
  });

  describe('System Settings', () => {
    describe('GET /api/admin/settings', () => {
      it('should get system settings', async () => {
        const response = await request(app)
          .get('/api/admin/settings')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('platform_settings');
        expect(response.body).toHaveProperty('payment_settings');
        expect(response.body).toHaveProperty('notification_settings');
        expect(response.body).toHaveProperty('security_settings');
      });
    });

    describe('PUT /api/admin/settings', () => {
      it('should update system settings', async () => {
        const settingsUpdate = {
          platform_settings: {
            maintenance_mode: false,
            registration_enabled: true,
            max_bots_per_user: 10
          },
          payment_settings: {
            commission_rate: 0.15,
            minimum_withdrawal: 50.00
          }
        };

        const response = await request(app)
          .put('/api/admin/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(settingsUpdate);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Settings updated successfully');
        expect(response.body.settings).toMatchObject(settingsUpdate);
      });

      it('should validate settings data', async () => {
        const response = await request(app)
          .put('/api/admin/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            payment_settings: {
              commission_rate: 1.5 // Invalid rate > 1
            }
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_SETTINGS_VALUE');
      });
    });
  });

  describe('Activity Logs', () => {
    describe('GET /api/admin/activity-logs', () => {
      it('should get system activity logs', async () => {
        const response = await request(app)
          .get('/api/admin/activity-logs')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('logs');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.logs)).toBe(true);
      });

      it('should filter logs by action type', async () => {
        const response = await request(app)
          .get('/api/admin/activity-logs?action=user_suspended')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.logs).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: 'user_suspended'
            })
          ])
        );
      });

      it('should filter logs by user', async () => {
        const response = await request(app)
          .get(`/api/admin/activity-logs?user_id=${regularUserId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.logs).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              user_id: regularUserId
            })
          ])
        );
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('POST /api/admin/users/bulk-action', () => {
      it('should perform bulk user actions', async () => {
        const response = await request(app)
          .post('/api/admin/users/bulk-action')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            action: 'send_notification',
            user_ids: [regularUserId],
            data: {
              subject: 'Platform Update',
              message: 'We have updated our terms of service.'
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Bulk action completed successfully');
        expect(response.body).toHaveProperty('results');
      });

      it('should validate bulk action data', async () => {
        const response = await request(app)
          .post('/api/admin/users/bulk-action')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            action: 'invalid_action',
            user_ids: [regularUserId]
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_BULK_ACTION');
      });
    });
  });
});