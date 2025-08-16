import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import AdminUsers from '@/pages/admin/users';

// Mock the dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/adminService', () => ({
  adminService: {
    getUsers: jest.fn(),
    updateUserStatus: jest.fn(),
    updateUserBalance: jest.fn(),
  },
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AdminUsers', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      asPath: '/admin/users',
      pathname: '/admin/users',
      query: {},
      route: '/admin/users',
    } as any);

    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-id',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render admin users page', async () => {
    const { adminService } = require('@/services/adminService');
    adminService.getUsers.mockResolvedValue({
      users: [
        {
          id: 'user-1',
          email: 'user1@test.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'user',
          balance: 100,
          emailVerified: true,
          status: 'active',
          createdAt: '2023-01-01T00:00:00Z',
          totalBots: 2,
          totalRevenue: 500,
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    render(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByText('Управление пользователями')).toBeInTheDocument();
    });

    expect(screen.getByText('Всего пользователей: 1')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('user1@test.com')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    const { adminService } = require('@/services/adminService');
    adminService.getUsers.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AdminUsers />);

    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });
});