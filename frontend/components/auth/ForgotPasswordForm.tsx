import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ForgotPasswordFormData } from '@/types/auth';
import { authService } from '@/services/authService';
import { validationRules, getErrorMessage } from '@/utils/validation';

export const ForgotPasswordForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      const response = await authService.forgotPassword(data);
      
      if (response.success) {
        setIsSubmitted(true);
        toast.success('Инструкции по восстановлению пароля отправлены на ваш email');
      } else {
        toast.error(getErrorMessage(response.error));
      }
    } catch (error) {
      toast.error('Произошла ошибка при отправке запроса');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md mx-auto p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Проверьте email
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Мы отправили инструкции по восстановлению пароля на адрес{' '}
            <span className="font-medium">{getValues('email')}</span>
          </p>
          <div className="space-y-4">
            <Button
              onClick={() => setIsSubmitted(false)}
              variant="outline"
              className="w-full"
            >
              Отправить повторно
            </Button>
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

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Восстановление пароля
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Введите email для получения инструкций по восстановлению пароля
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              className="pl-10"
              {...register('email', validationRules.email)}
            />
          </div>
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Отправка...' : 'Отправить инструкции'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Вернуться к входу
        </Link>
      </div>
    </Card>
  );
};