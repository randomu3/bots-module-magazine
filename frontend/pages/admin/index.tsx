import React, { useEffect, useState } from 'react';
import AdminRoute from '@/components/admin/AdminRoute';
import AdminLayout from '@/components/layout/AdminLayout';
import { adminService, AdminDashboardStats } from '@/services/adminService';
import {
  UsersIcon,
  CpuChipIcon,
  ChartBarIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError('Не удалось загрузить статистику');
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  };

  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0;
    return (
      <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
        ) : (
          <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
        )}
        <span className="text-sm font-medium">
          {Math.abs(growth).toFixed(1)}%
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  if (error) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              Ошибка загрузки
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <button
              onClick={loadDashboardStats}
              className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Повторить
            </button>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Панель администратора
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Обзор ключевых метрик платформы
            </p>
          </div>

          {/* Main Stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UsersIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Всего пользователей
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {stats?.totalUsers.toLocaleString()}
                        </div>
                        <div className="ml-2">
                          {formatGrowth(stats?.userGrowth || 0)}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CpuChipIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Подключенных ботов
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats?.totalBots.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Доступных модулей
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats?.totalModules.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BanknotesIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Общая выручка
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(stats?.totalRevenue || 0)}
                        </div>
                        <div className="ml-2">
                          {formatGrowth(stats?.revenueGrowth || 0)}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Активных пользователей
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats?.activeUsers.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Ожидают выплаты
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats?.pendingWithdrawals.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Открытых тикетов
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats?.pendingTickets.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Модулей на модерации
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats?.pendingModules.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Быстрые действия
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <a
                  href="/admin/users"
                  className="relative group bg-white dark:bg-gray-700 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 ring-4 ring-white dark:ring-gray-700">
                      <UsersIcon className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Управление пользователями
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Просмотр, блокировка и управление балансами пользователей
                    </p>
                  </div>
                </a>

                <a
                  href="/admin/modules"
                  className="relative group bg-white dark:bg-gray-700 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 ring-4 ring-white dark:ring-gray-700">
                      <ChartBarIcon className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Модерация модулей
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Одобрение и отклонение загруженных модулей
                    </p>
                  </div>
                </a>

                <a
                  href="/admin/withdrawals"
                  className="relative group bg-white dark:bg-gray-700 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-yellow-50 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 ring-4 ring-white dark:ring-gray-700">
                      <BanknotesIcon className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Обработка выплат
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Одобрение и отклонение заявок на вывод средств
                    </p>
                  </div>
                </a>

                <a
                  href="/admin/support"
                  className="relative group bg-white dark:bg-gray-700 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                >
                  <div>
                    <span className="rounded-lg inline-flex p-3 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 ring-4 ring-white dark:ring-gray-700">
                      <ExclamationTriangleIcon className="h-6 w-6" />
                    </span>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Техническая поддержка
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Управление тикетами и обратной связью
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminRoute>
  );
};

export default AdminDashboard;