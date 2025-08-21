import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { RegisterForm } from '../RegisterForm';
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
    register: jest.fn(),
  },
}));

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
};

describe('RegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders registration form correctly', () => {
    render(<RegisterForm />);
    
    expect(screen.getByText('Регистрация')).toBeInTheDocument();
    expect(screen.getByLabelText('Имя')).toBeInTheDocument();
    expect(screen.getByLabelText('Фамилия')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
    expect(screen.getByLabelText('Подтверждение пароля')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Зарегистрироваться' })).toBeInTheDocument();
    expect(screen.getByText('Войти')).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    render(<RegisterForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Зарегистрироваться' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Имя обязательно для заполнения')).toBeInTheDocument();
      expect(screen.getByText('Фамилия обязательна для заполнения')).toBeInTheDocument();
      expect(screen.getByText('Email обязателен для заполнения')).toBeInTheDocument();
      expect(screen.getByText('Пароль обязателен для заполнения')).toBeInTheDocument();
    });
  });

  it('shows password mismatch error', async () => {
    render(<RegisterForm />);
    
    const passwordInput = screen.getByLabelText('Пароль');
    const confirmPasswordInput = screen.getByLabelText('Подтверждение пароля');
    
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword123!' } });
    
    const submitButton = screen.getByRole('button', { name: 'Зарегистрироваться' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Пароли не совпадают')).toBeInTheDocument();
    });
  });

  it('shows weak password error', async () => {
    render(<RegisterForm />);
    
    const passwordInput = screen.getByLabelText('Пароль');
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    
    const submitButton = screen.getByRole('button', { name: 'Зарегистрироваться' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Пароль должен содержать минимум 8 символов')).toBeInTheDocument();
    });
  });

  it('handles successful registration', async () => {
    const mockResponse = {
      success: true,
      message: 'Регистрация успешна',
    };
    
    (authService.register as jest.Mock).mockResolvedValue(mockResponse);
    
    render(<RegisterForm />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Иван' } });
    fireEvent.change(screen.getByLabelText('Фамилия'), { target: { value: 'Иванов' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ivan@example.com' } });
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText('Подтверждение пароля'), { target: { value: 'Password123!' } });
    
    const submitButton = screen.getByRole('button', { name: 'Зарегистрироваться' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        firstName: 'Иван',
        lastName: 'Иванов',
        email: 'ivan@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
      expect(toast.success).toHaveBeenCalledWith('Регистрация успешна! Проверьте email для подтверждения аккаунта.');
      expect(mockPush).toHaveBeenCalledWith('/auth/verify-email?email=ivan%40example.com');
    });
  });

  it('handles registration error', async () => {
    const mockResponse = {
      success: false,
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Пользователь с таким email уже существует',
      },
    };
    
    (authService.register as jest.Mock).mockResolvedValue(mockResponse);
    
    render(<RegisterForm />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Иван' } });
    fireEvent.change(screen.getByLabelText('Фамилия'), { target: { value: 'Иванов' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText('Подтверждение пароля'), { target: { value: 'Password123!' } });
    
    const submitButton = screen.getByRole('button', { name: 'Зарегистрироваться' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Пользователь с таким email уже существует');
    });
  });
});