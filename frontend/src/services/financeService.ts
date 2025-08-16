import { Transaction, TransactionFilters, TransactionStats, WithdrawalRequest, WithdrawalLimits } from '@/types/finance';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export class FinanceService {
  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

  static async getTransactions(filters: TransactionFilters = {}): Promise<{
    transactions: Transaction[];
    total: number;
  }> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.request(`/transactions?${params.toString()}`);
  }

  static async getTransactionStats(): Promise<TransactionStats> {
    return this.request('/transactions/stats');
  }

  static async getUserBalance(): Promise<{ balance: number }> {
    return this.request('/transactions/balance');
  }

  static async getWithdrawalLimits(): Promise<WithdrawalLimits> {
    return this.request('/withdrawals/limits');
  }

  static async createWithdrawal(request: WithdrawalRequest): Promise<Transaction> {
    return this.request('/withdrawals', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  static async getWithdrawalHistory(page: number = 1, limit: number = 20): Promise<{
    withdrawals: Transaction[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    return this.request(`/withdrawals/history?page=${page}&limit=${limit}`);
  }

  static async cancelWithdrawal(transactionId: string): Promise<Transaction> {
    return this.request(`/withdrawals/${transactionId}/cancel`, {
      method: 'POST',
    });
  }

  static async exportTransactions(filters: TransactionFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/transactions/export?${params.toString()}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }
}