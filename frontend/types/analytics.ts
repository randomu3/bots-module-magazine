export interface RevenueData {
  date: string;
  revenue: number;
  transactions: number;
}

export interface ModuleRevenueData {
  moduleId: string;
  moduleName: string;
  revenue: number;
  transactions: number;
  conversionRate: number;
}

export interface BotAnalytics {
  botId: string;
  botName: string;
  totalRevenue: number;
  monthlyRevenue: number;
  dailyRevenue: number;
  activeUsers: number;
  totalUsers: number;
  conversionRate: number;
  revenueData: RevenueData[];
  moduleRevenueData: ModuleRevenueData[];
}

export interface DashboardStats {
  totalBots: number;
  activeModules: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalUsers: number;
  activeUsers: number;
  recentTransactions: Transaction[];
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'payment' | 'withdrawal' | 'commission' | 'refund';
  amount: number;
  currency: 'USD' | 'RUB';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  createdAt: string;
  processedAt: string | null;
}

export interface AnalyticsFilters {
  botId?: string;
  dateRange: {
    start: string;
    end: string;
  };
  groupBy?: 'day' | 'week' | 'month';
}