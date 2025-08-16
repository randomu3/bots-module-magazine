import { AuthResponse } from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Admin Dashboard Types
export interface AdminDashboardStats {
  totalUsers: number;
  totalBots: number;
  totalModules: number;
  totalRevenue: number;
  activeUsers: number;
  pendingWithdrawals: number;
  pendingTickets: number;
  pendingModules: number;
  revenueGrowth: number;
  userGrowth: number;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin' | 'developer';
  balance: number;
  emailVerified: boolean;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
  totalBots: number;
  totalRevenue: number;
}

export interface AdminBot {
  id: string;
  name: string;
  username: string;
  userId: string;
  userEmail: string;
  status: 'active' | 'inactive' | 'suspended';
  activeModules: number;
  totalRevenue: number;
  createdAt: string;
}

export interface AdminModule {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  developerId: string;
  developerEmail: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  activations: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWithdrawal {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  paymentMethod: string;
  paymentDetails: Record<string, any>;
  createdAt: string;
  processedAt?: string;
  notes?: string;
}

export interface AdminTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: string;
  createdAt: string;
  updatedAt: string;
  messagesCount: number;
  assignedTo?: string;
}

// API Functions
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const adminService = {
  // Dashboard
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard/stats`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }

    const data = await response.json();
    return data.data;
  },

  // Users Management
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    users: AdminUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.role) searchParams.append('role', params.role);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const response = await fetch(`${API_BASE_URL}/admin/users?${searchParams}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const data = await response.json();
    return data.data;
  },

  async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update user status');
    }
  },

  async updateUserBalance(userId: string, amount: number, operation: 'add' | 'subtract'): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/balance`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, operation }),
    });

    if (!response.ok) {
      throw new Error('Failed to update user balance');
    }
  },

  // Bots Management
  async getBots(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    userId?: string;
  }): Promise<{
    bots: AdminBot[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.userId) searchParams.append('userId', params.userId);

    const response = await fetch(`${API_BASE_URL}/admin/bots?${searchParams}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch bots');
    }

    const data = await response.json();
    return data.data;
  },

  async updateBotStatus(botId: string, status: 'active' | 'inactive' | 'suspended'): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/bots/${botId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update bot status');
    }
  },

  // Modules Management
  async getModules(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    category?: string;
  }): Promise<{
    modules: AdminModule[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.category) searchParams.append('category', params.category);

    const response = await fetch(`${API_BASE_URL}/admin/modules?${searchParams}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch modules');
    }

    const data = await response.json();
    return data.data;
  },

  async updateModuleStatus(moduleId: string, status: 'approved' | 'rejected' | 'suspended', notes?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/modules/${moduleId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, notes }),
    });

    if (!response.ok) {
      throw new Error('Failed to update module status');
    }
  },

  // Withdrawals Management
  async getWithdrawals(params?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
  }): Promise<{
    withdrawals: AdminWithdrawal[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.userId) searchParams.append('userId', params.userId);

    const response = await fetch(`${API_BASE_URL}/admin/withdrawals?${searchParams}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch withdrawals');
    }

    const data = await response.json();
    return data.data;
  },

  async processWithdrawal(withdrawalId: string, action: 'approve' | 'reject', notes?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/withdrawals/${withdrawalId}/process`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, notes }),
    });

    if (!response.ok) {
      throw new Error('Failed to process withdrawal');
    }
  },

  // Support Tickets Management
  async getTickets(params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: string;
  }): Promise<{
    tickets: AdminTicket[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.priority) searchParams.append('priority', params.priority);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.assignedTo) searchParams.append('assignedTo', params.assignedTo);

    const response = await fetch(`${API_BASE_URL}/admin/tickets?${searchParams}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tickets');
    }

    const data = await response.json();
    return data.data;
  },

  async updateTicketStatus(ticketId: string, status: 'open' | 'in_progress' | 'resolved' | 'closed'): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/tickets/${ticketId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update ticket status');
    }
  },

  async assignTicket(ticketId: string, assignedTo: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/tickets/${ticketId}/assign`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ assignedTo }),
    });

    if (!response.ok) {
      throw new Error('Failed to assign ticket');
    }
  },
};