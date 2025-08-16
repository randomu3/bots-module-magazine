import { BotAnalytics, DashboardStats, AnalyticsFilters } from '@/types/analytics';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class AnalyticsService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/api/analytics/dashboard');
  }

  async getBotAnalytics(botId: string, filters?: AnalyticsFilters): Promise<BotAnalytics> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange.start);
        params.append('endDate', filters.dateRange.end);
      }
      if (filters.groupBy) params.append('groupBy', filters.groupBy);
    }

    const queryString = params.toString();
    const endpoint = queryString 
      ? `/api/analytics/bots/${botId}?${queryString}` 
      : `/api/analytics/bots/${botId}`;
    
    return this.request<BotAnalytics>(endpoint);
  }

  async getRevenueData(filters?: AnalyticsFilters): Promise<any> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.botId) params.append('botId', filters.botId);
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange.start);
        params.append('endDate', filters.dateRange.end);
      }
      if (filters.groupBy) params.append('groupBy', filters.groupBy);
    }

    const queryString = params.toString();
    const endpoint = queryString 
      ? `/api/analytics/revenue?${queryString}` 
      : '/api/analytics/revenue';
    
    return this.request<any>(endpoint);
  }
}

export const analyticsService = new AnalyticsService();