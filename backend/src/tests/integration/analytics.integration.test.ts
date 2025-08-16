import '../integration-setup';
import request from 'supertest';
import app from '../../index';
import { UserModel } from '../../models/User';
import { BotModel } from '../../models/Bot';
import { EmailVerificationTokenModel } from '../../models/EmailVerificationToken';
import { TelegramService } from '../../services/telegramService';

// Mock services
jest.mock('../../services/telegramService');
const mockTelegramService = TelegramService as jest.Mocked<typeof TelegramService>;

jest.mock('../../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  verifyEmailConfig: jest.fn().mockResolvedValue(true)
}));

describe('Analytics Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let botId: string;
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    // Create regular test user
    const userData = {
      email: `analyticstest-${Date.now()}@example.com`,
      password: 'testpassword123',
      first_name: 'Analytics',
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
      email: `admin-analytics-${Date.now()}@example.com`,
      password: 'adminpassword123',
      first_name: 'Admin',
      last_name: 'Analytics',
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

    // Create a test bot
    const mockBotInfo = {
      id: 123456789,
      is_bot: true,
      first_name: 'Analytics Test Bot',
      username: 'analyticstestbot'
    };

    mockTelegramService.validateBotToken.mockResolvedValueOnce(mockBotInfo);
    mockTelegramService.setWebhook.mockResolvedValueOnce(true);

    const botResponse = await request(app)
      .post('/api/bots/connect')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        token: 'analytics_test_bot_token',
        webhook_url: 'https://example.com/webhook'
      });

    botId = botResponse.body.bot.id;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Analytics', () => {
    describe('GET /api/analytics/revenue', () => {
      it('should get user revenue analytics', async () => {
        const response = await request(app)
          .get('/api/analytics/revenue')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('total_revenue');
        expect(response.body).toHaveProperty('monthly_revenue');
        expect(response.body).toHaveProperty('revenue_by_module');
        expect(response.body).toHaveProperty('revenue_by_bot');
        expect(response.body).toHaveProperty('growth_rate');
        expect(typeof response.body.total_revenue).toBe('number');
      });

      it('should filter revenue by date range', async () => {
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';

        const response = await request(app)
          .get(`/api/analytics/revenue?start_date=${startDate}&end_date=${endDate}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('date_range');
        expect(response.body.date_range).toMatchObject({
          start: startDate,
          end: endDate
        });
      });

      it('should filter revenue by specific bot', async () => {
        const response = await request(app)
          .get(`/api/analytics/revenue?bot_id=${botId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('bot_id');
        expect(response.body.bot_id).toBe(botId);
      });

      it('should group revenue by different periods', async () => {
        const response = await request(app)
          .get('/api/analytics/revenue?group_by=week')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('grouped_data');
        expect(Array.isArray(response.body.grouped_data)).toBe(true);
      });
    });

    describe('GET /api/analytics/bot-stats', () => {
      it('should get bot performance statistics', async () => {
        const response = await request(app)
          .get(`/api/analytics/bot-stats/${botId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('bot_id');
        expect(response.body).toHaveProperty('subscribers');
        expect(response.body).toHaveProperty('active_modules');
        expect(response.body).toHaveProperty('revenue');
        expect(response.body).toHaveProperty('engagement_metrics');
        expect(response.body.bot_id).toBe(botId);
      });

      it('should get subscriber growth analytics', async () => {
        const response = await request(app)
          .get(`/api/analytics/bot-stats/${botId}/subscribers`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('total_subscribers');
        expect(response.body).toHaveProperty('new_subscribers');
        expect(response.body).toHaveProperty('churned_subscribers');
        expect(response.body).toHaveProperty('growth_rate');
        expect(response.body).toHaveProperty('subscriber_timeline');
      });

      it('should get message analytics', async () => {
        const response = await request(app)
          .get(`/api/analytics/bot-stats/${botId}/messages`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('total_messages');
        expect(response.body).toHaveProperty('messages_per_day');
        expect(response.body).toHaveProperty('popular_commands');
        expect(response.body).toHaveProperty('response_times');
        expect(response.body).toHaveProperty('error_rates');
      });

      it('should return 404 for non-existent bot', async () => {
        const response = await request(app)
          .get('/api/analytics/bot-stats/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('BOT_NOT_FOUND');
      });
    });

    describe('GET /api/analytics/module-usage', () => {
      it('should get module usage statistics', async () => {
        const response = await request(app)
          .get('/api/analytics/module-usage')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('active_modules');
        expect(response.body).toHaveProperty('module_performance');
        expect(response.body).toHaveProperty('revenue_by_module');
        expect(response.body).toHaveProperty('usage_trends');
        expect(Array.isArray(response.body.active_modules)).toBe(true);
      });

      it('should filter module usage by category', async () => {
        const response = await request(app)
          .get('/api/analytics/module-usage?category=advertising')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('category');
        expect(response.body.category).toBe('advertising');
      });

      it('should get detailed module performance metrics', async () => {
        const response = await request(app)
          .get('/api/analytics/module-usage/module-123/performance')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('module_id');
        expect(response.body).toHaveProperty('activation_count');
        expect(response.body).toHaveProperty('revenue_generated');
        expect(response.body).toHaveProperty('user_satisfaction');
        expect(response.body).toHaveProperty('performance_metrics');
      });
    });

    describe('GET /api/analytics/earnings', () => {
      it('should get earnings breakdown', async () => {
        const response = await request(app)
          .get('/api/analytics/earnings')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('total_earnings');
        expect(response.body).toHaveProperty('pending_earnings');
        expect(response.body).toHaveProperty('withdrawn_earnings');
        expect(response.body).toHaveProperty('earnings_by_source');
        expect(response.body).toHaveProperty('commission_breakdown');
      });

      it('should get referral earnings', async () => {
        const response = await request(app)
          .get('/api/analytics/earnings/referrals')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('total_referral_earnings');
        expect(response.body).toHaveProperty('active_referrals');
        expect(response.body).toHaveProperty('referral_conversion_rate');
        expect(response.body).toHaveProperty('top_performing_referrals');
      });
    });

    describe('GET /api/analytics/dashboard', () => {
      it('should get dashboard overview data', async () => {
        const response = await request(app)
          .get('/api/analytics/dashboard')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('overview');
        expect(response.body).toHaveProperty('recent_activity');
        expect(response.body).toHaveProperty('quick_stats');
        expect(response.body).toHaveProperty('charts_data');
        
        expect(response.body.overview).toHaveProperty('total_bots');
        expect(response.body.overview).toHaveProperty('active_modules');
        expect(response.body.overview).toHaveProperty('total_revenue');
        expect(response.body.overview).toHaveProperty('total_subscribers');
      });

      it('should get real-time metrics', async () => {
        const response = await request(app)
          .get('/api/analytics/dashboard/realtime')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('active_users');
        expect(response.body).toHaveProperty('messages_per_minute');
        expect(response.body).toHaveProperty('revenue_today');
        expect(response.body).toHaveProperty('system_status');
        expect(response.body).toHaveProperty('last_updated');
      });
    });
  });

  describe('Admin Analytics', () => {
    describe('GET /api/analytics/admin-dashboard', () => {
      it('should get admin dashboard data', async () => {
        const response = await request(app)
          .get('/api/analytics/admin-dashboard')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('platform_overview');
        expect(response.body).toHaveProperty('user_metrics');
        expect(response.body).toHaveProperty('revenue_metrics');
        expect(response.body).toHaveProperty('system_health');
        
        expect(response.body.platform_overview).toHaveProperty('total_users');
        expect(response.body.platform_overview).toHaveProperty('total_bots');
        expect(response.body.platform_overview).toHaveProperty('total_modules');
        expect(response.body.platform_overview).toHaveProperty('platform_revenue');
      });

      it('should reject non-admin access', async () => {
        const response = await request(app)
          .get('/api/analytics/admin-dashboard')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });
    });

    describe('GET /api/analytics/admin/users', () => {
      it('should get user analytics for admin', async () => {
        const response = await request(app)
          .get('/api/analytics/admin/users')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user_growth');
        expect(response.body).toHaveProperty('user_activity');
        expect(response.body).toHaveProperty('user_segments');
        expect(response.body).toHaveProperty('churn_analysis');
        expect(response.body).toHaveProperty('geographic_distribution');
      });

      it('should get user cohort analysis', async () => {
        const response = await request(app)
          .get('/api/analytics/admin/users/cohorts')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('cohort_data');
        expect(response.body).toHaveProperty('retention_rates');
        expect(response.body).toHaveProperty('cohort_revenue');
        expect(Array.isArray(response.body.cohort_data)).toBe(true);
      });
    });

    describe('GET /api/analytics/admin/revenue', () => {
      it('should get platform revenue analytics', async () => {
        const response = await request(app)
          .get('/api/analytics/admin/revenue')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('total_platform_revenue');
        expect(response.body).toHaveProperty('commission_earned');
        expect(response.body).toHaveProperty('revenue_by_module');
        expect(response.body).toHaveProperty('revenue_trends');
        expect(response.body).toHaveProperty('top_earning_users');
      });

      it('should get financial reports', async () => {
        const response = await request(app)
          .get('/api/analytics/admin/revenue/reports')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({
            report_type: 'monthly',
            year: '2024'
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('report_data');
        expect(response.body).toHaveProperty('summary');
        expect(response.body).toHaveProperty('generated_at');
      });
    });

    describe('GET /api/analytics/admin/modules', () => {
      it('should get module performance analytics', async () => {
        const response = await request(app)
          .get('/api/analytics/admin/modules')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('module_statistics');
        expect(response.body).toHaveProperty('popular_modules');
        expect(response.body).toHaveProperty('module_revenue');
        expect(response.body).toHaveProperty('developer_metrics');
        expect(response.body).toHaveProperty('approval_metrics');
      });

      it('should get module quality metrics', async () => {
        const response = await request(app)
          .get('/api/analytics/admin/modules/quality')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('quality_scores');
        expect(response.body).toHaveProperty('user_ratings');
        expect(response.body).toHaveProperty('bug_reports');
        expect(response.body).toHaveProperty('performance_issues');
      });
    });

    describe('GET /api/analytics/admin/system', () => {
      it('should get system performance metrics', async () => {
        const response = await request(app)
          .get('/api/analytics/admin/system')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('api_performance');
        expect(response.body).toHaveProperty('database_metrics');
        expect(response.body).toHaveProperty('error_rates');
        expect(response.body).toHaveProperty('uptime_statistics');
        expect(response.body).toHaveProperty('resource_usage');
      });

      it('should get error analytics', async () => {
        const response = await request(app)
          .get('/api/analytics/admin/system/errors')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('error_summary');
        expect(response.body).toHaveProperty('error_trends');
        expect(response.body).toHaveProperty('critical_errors');
        expect(response.body).toHaveProperty('resolution_times');
      });
    });
  });

  describe('Analytics Export', () => {
    it('should export analytics data as CSV', async () => {
      const response = await request(app)
        .get('/api/analytics/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          format: 'csv',
          data_type: 'revenue',
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should export analytics data as JSON', async () => {
      const response = await request(app)
        .get('/api/analytics/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          format: 'json',
          data_type: 'bot_stats',
          bot_id: botId
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('export_data');
      expect(response.body).toHaveProperty('metadata');
    });

    it('should validate export parameters', async () => {
      const response = await request(app)
        .get('/api/analytics/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          format: 'invalid_format',
          data_type: 'revenue'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_EXPORT_FORMAT');
    });
  });

  describe('Real-time Analytics', () => {
    it('should get real-time revenue updates', async () => {
      const response = await request(app)
        .get('/api/analytics/realtime/revenue')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('current_revenue');
      expect(response.body).toHaveProperty('revenue_rate');
      expect(response.body).toHaveProperty('last_transactions');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should get real-time bot activity', async () => {
      const response = await request(app)
        .get(`/api/analytics/realtime/bot-activity/${botId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('active_users');
      expect(response.body).toHaveProperty('messages_per_minute');
      expect(response.body).toHaveProperty('recent_interactions');
      expect(response.body).toHaveProperty('bot_status');
    });
  });

  describe('Custom Analytics Queries', () => {
    it('should execute custom analytics query', async () => {
      const customQuery = {
        metrics: ['revenue', 'user_count'],
        dimensions: ['date', 'module_category'],
        filters: {
          date_range: {
            start: '2024-01-01',
            end: '2024-12-31'
          },
          module_category: 'advertising'
        },
        group_by: 'month'
      };

      const response = await request(app)
        .post('/api/analytics/custom-query')
        .set('Authorization', `Bearer ${authToken}`)
        .send(customQuery);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('query_results');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('query_execution_time');
    });

    it('should validate custom query structure', async () => {
      const invalidQuery = {
        metrics: [], // Empty metrics
        dimensions: ['invalid_dimension']
      };

      const response = await request(app)
        .post('/api/analytics/custom-query')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidQuery);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_QUERY_STRUCTURE');
    });
  });
});