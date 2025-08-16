import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AnalyticsService } from '../services/analyticsService';

export class AnalyticsController {
  // Get user revenue statistics
  static async getUserRevenueStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { period } = req.query;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const stats = await AnalyticsService.getUserRevenueStats(userId, period as string);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting user revenue stats:', error);
      res.status(500).json({
        error: {
          code: 'ANALYTICS_ERROR',
          message: error.message || 'Failed to get revenue statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Get user bot analytics
  static async getUserBotAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { bot_id } = req.query;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const analytics = await AnalyticsService.getUserBotAnalytics(userId, bot_id as string);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      console.error('Error getting bot analytics:', error);
      res.status(500).json({
        error: {
          code: 'ANALYTICS_ERROR',
          message: error.message || 'Failed to get bot analytics',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Get period-based statistics for charts
  static async getPeriodStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { period = '30d', bot_id } = req.query;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const stats = await AnalyticsService.getPeriodStats(
        userId, 
        period as string, 
        bot_id as string
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting period stats:', error);
      res.status(500).json({
        error: {
          code: 'ANALYTICS_ERROR',
          message: error.message || 'Failed to get period statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Get module performance analytics
  static async getModuleAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const analytics = await AnalyticsService.getModuleAnalytics(userId);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      console.error('Error getting module analytics:', error);
      res.status(500).json({
        error: {
          code: 'ANALYTICS_ERROR',
          message: error.message || 'Failed to get module analytics',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Admin: Get platform statistics
  static async getPlatformStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const stats = await AnalyticsService.getPlatformStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting platform stats:', error);
      res.status(500).json({
        error: {
          code: 'ANALYTICS_ERROR',
          message: error.message || 'Failed to get platform statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  } 
 // Admin: Get user activity report
  static async getUserActivityReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { start_date, end_date, page, limit } = req.query;

      const filters: any = {};
      if (start_date) filters.start_date = new Date(start_date as string);
      if (end_date) filters.end_date = new Date(end_date as string);
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const report = await AnalyticsService.getUserActivityReport(filters);

      res.json({
        success: true,
        data: report
      });
    } catch (error: any) {
      console.error('Error getting user activity report:', error);
      res.status(500).json({
        error: {
          code: 'ANALYTICS_ERROR',
          message: error.message || 'Failed to get user activity report',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Admin: Get financial report
  static async getFinancialReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'admin') {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { period = '30d' } = req.query;

      const report = await AnalyticsService.getFinancialReport(period as string);

      res.json({
        success: true,
        data: report
      });
    } catch (error: any) {
      console.error('Error getting financial report:', error);
      res.status(500).json({
        error: {
          code: 'ANALYTICS_ERROR',
          message: error.message || 'Failed to get financial report',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Export analytics data (CSV format)
  static async exportAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { type, period = '30d', format = 'csv' } = req.query;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      let data: any;
      let filename: string;

      switch (type) {
        case 'revenue':
          data = await AnalyticsService.getUserRevenueStats(userId, period as string);
          filename = `revenue-stats-${period}.csv`;
          break;
        case 'bots':
          data = await AnalyticsService.getUserBotAnalytics(userId);
          filename = `bot-analytics.csv`;
          break;
        case 'modules':
          data = await AnalyticsService.getModuleAnalytics(userId);
          filename = `module-analytics.csv`;
          break;
        case 'period':
          data = await AnalyticsService.getPeriodStats(userId, period as string);
          filename = `period-stats-${period}.csv`;
          break;
        case 'platform':
          if (userRole !== 'admin') {
            res.status(403).json({
              error: {
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'Admin access required',
                timestamp: new Date().toISOString()
              }
            });
            return;
          }
          data = await AnalyticsService.getPlatformStats();
          filename = `platform-stats.csv`;
          break;
        default:
          res.status(400).json({
            error: {
              code: 'INVALID_TYPE',
              message: 'Invalid export type',
              timestamp: new Date().toISOString()
            }
          });
          return;
      }

      if (format === 'csv') {
        const csv = this.convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
      } else {
        res.json({
          success: true,
          data
        });
      }
    } catch (error: any) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({
        error: {
          code: 'EXPORT_ERROR',
          message: error.message || 'Failed to export analytics data',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Helper method to convert data to CSV
  private static convertToCSV(data: any): string {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return '';
    }

    const items = Array.isArray(data) ? data : [data];
    const headers = Object.keys(items[0]);
    
    const csvRows = [
      headers.join(','),
      ...items.map(item => 
        headers.map(header => {
          const value = item[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }
}