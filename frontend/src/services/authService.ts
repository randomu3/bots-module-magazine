import axios from 'axios';
import { LoginFormData, RegisterFormData, ForgotPasswordFormData, ResetPasswordFormData, AuthResponse } from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const authAPI = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authService = {
  async login(data: LoginFormData): Promise<AuthResponse> {
    try {
      const response = await authAPI.post('/login', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'LOGIN_FAILED',
          message: error.response?.data?.error?.message || 'Ошибка входа в систему',
          details: error.response?.data?.error?.details,
        },
      };
    }
  },

  async register(data: RegisterFormData): Promise<AuthResponse> {
    try {
      const response = await authAPI.post('/register', {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'REGISTRATION_FAILED',
          message: error.response?.data?.error?.message || 'Ошибка регистрации',
          details: error.response?.data?.error?.details,
        },
      };
    }
  },

  async forgotPassword(data: ForgotPasswordFormData): Promise<AuthResponse> {
    try {
      const response = await authAPI.post('/forgot-password', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'FORGOT_PASSWORD_FAILED',
          message: error.response?.data?.error?.message || 'Ошибка восстановления пароля',
          details: error.response?.data?.error?.details,
        },
      };
    }
  },

  async resetPassword(token: string, data: ResetPasswordFormData): Promise<AuthResponse> {
    try {
      const response = await authAPI.post('/reset-password', {
        token,
        password: data.password,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'RESET_PASSWORD_FAILED',
          message: error.response?.data?.error?.message || 'Ошибка сброса пароля',
          details: error.response?.data?.error?.details,
        },
      };
    }
  },

  async verifyEmail(token: string): Promise<AuthResponse> {
    try {
      const response = await authAPI.post('/verify-email', { token });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'EMAIL_VERIFICATION_FAILED',
          message: error.response?.data?.error?.message || 'Ошибка подтверждения email',
          details: error.response?.data?.error?.details,
        },
      };
    }
  },
};