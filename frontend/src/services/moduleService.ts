import { 
  Module, 
  ModuleCategory, 
  BotModuleActivation, 
  ActivateModuleRequest, 
  ModuleFilters 
} from '@/types/module';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ModuleService {
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

  async getModules(filters?: ModuleFilters): Promise<Module[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters.priceRange) {
        params.append('minPrice', filters.priceRange.min.toString());
        params.append('maxPrice', filters.priceRange.max.toString());
      }
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/api/modules?${queryString}` : '/api/modules';
    
    return this.request<Module[]>(endpoint);
  }

  async getModule(id: string): Promise<Module> {
    return this.request<Module>(`/api/modules/${id}`);
  }

  async getCategories(): Promise<ModuleCategory[]> {
    return this.request<ModuleCategory[]>('/api/modules/categories');
  }

  async activateModule(data: ActivateModuleRequest): Promise<BotModuleActivation> {
    return this.request<BotModuleActivation>('/api/modules/activate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deactivateModule(activationId: string): Promise<void> {
    return this.request<void>(`/api/modules/activations/${activationId}`, {
      method: 'DELETE',
    });
  }

  async getBotModules(botId: string): Promise<BotModuleActivation[]> {
    return this.request<BotModuleActivation[]>(`/api/bots/${botId}/modules`);
  }

  async updateModuleSettings(activationId: string, settings: Record<string, any>): Promise<BotModuleActivation> {
    return this.request<BotModuleActivation>(`/api/modules/activations/${activationId}`, {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
  }
}

export const moduleService = new ModuleService();