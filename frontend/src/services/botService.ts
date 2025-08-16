import { Bot, BotStats, CreateBotRequest, UpdateBotRequest } from '@/types/bot';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class BotService {
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

  async getBots(): Promise<Bot[]> {
    return this.request<Bot[]>('/api/bots');
  }

  async getBot(id: string): Promise<Bot> {
    return this.request<Bot>(`/api/bots/${id}`);
  }

  async createBot(data: CreateBotRequest): Promise<Bot> {
    return this.request<Bot>('/api/bots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBot(id: string, data: UpdateBotRequest): Promise<Bot> {
    return this.request<Bot>(`/api/bots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBot(id: string): Promise<void> {
    return this.request<void>(`/api/bots/${id}`, {
      method: 'DELETE',
    });
  }

  async getBotStats(id: string): Promise<BotStats> {
    return this.request<BotStats>(`/api/bots/${id}/stats`);
  }
}

export const botService = new BotService();