import { BroadcastCampaign, CreateBroadcastInput, BroadcastStats, BroadcastReport, BroadcastTarget } from '@/types/broadcast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export class BroadcastService {
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

  static async createBroadcast(input: CreateBroadcastInput): Promise<BroadcastCampaign> {
    return this.request('/broadcasts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  static async getBroadcasts(options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<BroadcastCampaign[]> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.request(`/broadcasts?${params.toString()}`);
  }

  static async getBroadcast(id: string): Promise<BroadcastCampaign> {
    return this.request(`/broadcasts/${id}`);
  }

  static async executeBroadcast(id: string): Promise<BroadcastStats> {
    return this.request(`/broadcasts/${id}/execute`, {
      method: 'POST',
    });
  }

  static async cancelBroadcast(id: string): Promise<void> {
    return this.request(`/broadcasts/${id}/cancel`, {
      method: 'POST',
    });
  }

  static async getBroadcastStats(id: string): Promise<BroadcastStats> {
    return this.request(`/broadcasts/${id}/stats`);
  }

  static async getBroadcastReport(id: string): Promise<BroadcastReport> {
    return this.request(`/broadcasts/${id}/report`);
  }

  static async validateTargets(targets: BroadcastTarget[]): Promise<{
    valid: boolean;
    errors: string[];
    totalChatIds: number;
  }> {
    return this.request('/broadcasts/validate-targets', {
      method: 'POST',
      body: JSON.stringify({ targets }),
    });
  }

  static async estimateCost(targets: BroadcastTarget[]): Promise<{
    totalMessages: number;
    estimatedCost: number;
    currency: string;
  }> {
    return this.request('/broadcasts/estimate-cost', {
      method: 'POST',
      body: JSON.stringify({ targets }),
    });
  }

  static async getBotSubscribers(botId: string): Promise<{
    subscribers: Array<{
      chat_id: string;
      username?: string;
      first_name?: string;
      last_name?: string;
      is_active: boolean;
      subscribed_at: string;
    }>;
    total: number;
  }> {
    return this.request(`/bots/${botId}/subscribers`);
  }
}