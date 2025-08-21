import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { LoginForm } from '../LoginForm';
import { authService } from '@/services/authService';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@/services/authService', () => ({
  authService: {
    login: jest.fn(),
  },
}));

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders login form correctly', () => {
    render(<LoginForm />);
    
    expect(screen.getByText('Вход в систему')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
    expect(screen.getByText('Забыли пароль?')).toBeInTheDocument();
    expect(screen.getByText('Зарегистрироваться')).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    render(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Войти' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email обязателен для заполнения')).toBeInTheDocument();
      expect(screen.getByText('Пароль обязателен для заполнения')).toBeInTheDocument();
    });
  });

  it('validates email format on form submission', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Пароль');
    
    // HTML5 validation will prevent form submission with invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    const submitButton = screen.getByRole('button', { name: 'Войти' });
    fireEvent.click(submitButton);

    // The form should not submit with invalid email due to HTML5 validation
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('toggles password visibility', () => {
    render(<LoginForm />);
    
    const passwordInput = screen.getByLabelText('Пароль');
    const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('handles successful login', async () => {
    const mockResponse = {
      success: true,
      token: 'mock-token',
      user: { id: '1', email: 'test@example.com' },
    };
    
    (authService.login as jest.Mock).mockResolvedValue(mockResponse);
    
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Пароль');
    const submitButton = screen.getByRole('button', { name: 'Войти' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(toast.success).toHaveBeenCalledWith('Вход выполнен успешно!');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles login error', async () => {
    const mockResponse = {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Неверные учетные данные',
      },
    };
    
    (authService.login as jest.Mock).mockResolvedValue(mockResponse);
    
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Пароль');
    const submitButton = screen.getByRole('button', { name: 'Войти' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Неверные учетные данные');
    });
  });
});