export interface Module {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  developerId: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  codeUrl: string;
  documentationUrl: string;
  apiEndpoints: string[];
  webhookRequired: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleCategory {
  id: string;
  name: string;
  description: string;
  moduleCount: number;
}

export interface BotModuleActivation {
  id: string;
  botId: string;
  moduleId: string;
  markupPercentage: number;
  apiKey: string;
  status: 'active' | 'inactive';
  settings: Record<string, any>;
  activatedAt: string;
  expiresAt: string | null;
  module: Module;
}

export interface ActivateModuleRequest {
  botId: string;
  moduleId: string;
  markupPercentage: number;
  settings?: Record<string, any>;
}

export interface ModuleFilters {
  category?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  search?: string;
  sortBy?: 'name' | 'price' | 'rating' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}