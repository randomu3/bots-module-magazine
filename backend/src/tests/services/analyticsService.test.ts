import { AnalyticsService } from '../../services/analyticsService';
import pool from '../../config/database';

// Mock the database pool
jest.mock('../../config/database');
const mockPool = pool as jest.Mocked<typeof pool>;

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserRevenueStats', () => {
    it('should return user revenue statistics', async () => {
      const mockStats = {
        total_revenue: '1000.00',
        monthly_revenue: '300.00',
        daily_revenue: '50.00'
      };

      const mockGrowthResult = {
        previous_month_revenue: '200.00'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockStats] } as any)
        .mockResolvedValueOnce({ rows: [mockGrowthResult] } as any);

      const result = await AnalyticsService.getUserRevenueStats('user-1');

      expect(result).toEqual({
        total_revenue: 1000,
        monthly_revenue: 300,
        daily_revenue: 50,
        revenue_growth: 50 // (300-200)/200 * 100
      });

      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });
});