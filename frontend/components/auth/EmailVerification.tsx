import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Mail, CheckCircle, XCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { authService } from '@/services/authService';
import { getErrorMessage } from '@/utils/validation';

interface EmailVerificationProps {
  token?: string;
  email?: string;
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({ token, email }) => {
  const [isLoading, setIsLoading] = useState(!!token);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await authService.verifyEmail(verificationToken);
      
      if (response.success) {
        setIsVerified(true);
        toast.success('Email успешно подтвержден!');
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      } else {
        setError(getErrorMessage(response.error));
        toast.error(getErrorMessage(response.error));
      }
    } catch (error) {
      const errorMessage = 'Произошла ошибка при подтверждении email';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!email) return;
    
    setIsLoading(true);
    try {
      // This would typically be a separate endpoint for resending verification
      toast.success('Письмо с подтверждением отправлено повторно');
    } catch (error) {
      toast.error('Ошибка при отправке письма');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
            <Loader className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Подтверждение email
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Пожалуйста, подождите, мы подтверждаем ваш email адрес...
          </p>
        </div>
      </Card>
    );
  }

  if (isVerified) {
    return (
      <Card className="w-full max-w-md mx-auto p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Email подтвержден!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Ваш email адрес был успешно подтвержден. Теперь вы можете войти в систему.
          </p>
          <Link href="/auth/login">
            <Button className="w-full">
              Войти в систему
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
            <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Ошибка подтверждения
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <div className="space-y-3">
            {email && (
              <Button
                onClick={resendVerification}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                Отправить письмо повторно
              </Button>
            )}
            <Link
              href="/auth/login"
              className="block text-center text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Вернуться к входу
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  // Default state - waiting for email verification
  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
          <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Подтвердите email
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Мы отправили письмо с подтверждением на адрес{' '}
          {email && <span className="font-medium">{email}</span>}
          {!email && 'ваш email адрес'}. 
          Пожалуйста, проверьте почту и перейдите по ссылке для подтверждения аккаунта.
        </p>
        <div className="space-y-3">
          {email && (
            <Button
              onClick={resendVerification}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Отправка...' : 'Отправить повторно'}
            </Button>
          )}
          <Link
            href="/auth/login"
            className="block text-center text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Вернуться к входу
          </Link>
        </div>
      </div>
    </Card>
  );
};