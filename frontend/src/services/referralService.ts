import { ReferralStats, ReferralList, ReferralProgramInfo, ReferralTier } from '@/types/referral';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export class ReferralService {
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

  static async getReferralStats(): Promise<ReferralStats> {
    return this.request('/referrals/stats');
  }

  static async getReferralCode(): Promise<{ referralCode: string }> {
    return this.request('/referrals/code');
  }

  static async getReferralLink(): Promise<{ referralLink: string }> {
    return this.request('/referrals/link');
  }

  static async getUserTier(): Promise<ReferralTier> {
    return this.request('/referrals/tier');
  }

  static async getReferralList(page: number = 1, limit: number = 20): Promise<ReferralList> {
    return this.request(`/referrals/list?page=${page}&limit=${limit}`);
  }

  static async getProgramInfo(): Promise<ReferralProgramInfo> {
    return this.request('/referrals/program-info');
  }

  static async getTopReferrers(limit: number = 10): Promise<Array<{
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    totalReferrals: number;
    activeReferrals: number;
    totalCommission: number;
    tier: string;
  }>> {
    return this.request(`/referrals/leaderboard?limit=${limit}`);
  }

  static async validateReferralCode(code: string): Promise<{
    valid: boolean;
    referrer?: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
    error?: string;
  }> {
    return this.request(`/referrals/validate/${code}`);
  }
}