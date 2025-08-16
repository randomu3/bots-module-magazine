import request from 'supertest';
import app from '../../index';
import jwt from 'jsonwebtoken';

// Mock the AdminService
const mockAdminService = {
  getDashboardStats: jest.fn(),
  getUsers: jest.fn(),
  updateUserStatus: jest.fn(),
  updateUserBalance: jest.fn(),
  getBots: jest.fn(),
  updateBotStatus: jest.fn(),
  getModules: jest.fn(),
  updateModuleStatus: jest.fn(),
  getWithdrawals: jest.fn(),
  processWithdrawal: jest.fn(),
  getTickets: jest.fn(),
  updateTicketStatus: jest.fn(),
  assignTicket: jest.fn(),
};

jest.mock('../../services/adminService', () => ({
  AdminService: mockAdminService,
}));

describe('AdminController', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(() => {
    // Create test tokens
    adminToken = jwt.sign(
      { id: 'admin-id', email: 'admin@test.com', role: 'admin' },
      process.env['JWT_SECRET'] || 'test-secret'
    );
    
    userToken = jwt.sign(
      { id: 'user-id', email: 'user@test.com', role: 'user' },
      process.env['JWT_SECRET'] || 'test-secret'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/dashboard/stats', () => {
    it('should return dashboard stats for admin', async () => {
      const mockStats = {
        totalUsers: 100,
        totalBots: 50,
        totalModules: 25,
        totalRevenue: 10000,
        activeUsers: 80,
        pendingWithdrawals: 5,
        pendingTickets: 3,
        pendingModules: 2,
        revenueGrowth: 15.5,
        userGrowth: 10.2,
      };

      mockAdminService.getDashboardStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
      expect(mockAdminService.getDashboardStats).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return paginated users list for admin', async () => {
      const mockUsersResponse = {
        users: [
          {
            id: 'user-1',
            email: 'user1@test.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'user',
            balance: 100,
            emailVerified: true,
            status: 'active',
            createdAt: '2023-01-01T00:00:00Z',
            totalBots: 2,
            totalRevenue: 500,
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockAdminService.getUsers.mockResolvedValue(mockUsersResponse);

      const response = await request(app)
        .get('/api/admin/users?page=1&limit=20')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUsersResponse);
      expect(mockAdminService.getUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        role: undefined,
        status: undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });
  });

  describe('PUT /api/admin/users/:userId/status', () => {
    it('should update user status for admin', async () => {
      mockAdminService.updateUserStatus.mockResolvedValue(undefined);

      const response = await request(app)
        .put('/api/admin/users/user-1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User status updated successfully');
      expect(mockAdminService.updateUserStatus).toHaveBeenCalledWith('user-1', 'suspended');
    });
  });

  describe('PUT /api/admin/users/:userId/balance', () => {
    it('should update user balance for admin', async () => {
      mockAdminService.updateUserBalance.mockResolvedValue(undefined);

      const response = await request(app)
        .put('/api/admin/users/user-1/balance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 100, operation: 'add' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User balance updated successfully');
      expect(mockAdminService.updateUserBalance).toHaveBeenCalledWith('user-1', 100, 'add');
    });
  });
});