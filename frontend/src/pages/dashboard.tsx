import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { analyticsService } from '@/services/analyticsService';
import { DashboardStats as DashboardStatsType } from '@/types/analytics';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const dashboardStats = await analyticsService.getDashboardStats();
        setStats(dashboardStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Панель управления - TeleBotics</title>
          <meta name="description" content="Панель управления TeleBotics" />
        </Head>
        <DashboardLayout>
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Загрузка данных...</p>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Панель управления - TeleBotics</title>
        <meta name="description" content="Панель управления TeleBotics" />
      </Head>
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Панель управления
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Добро пожаловать в TeleBotics! Управляйте своими ботами и модулями.
                </p>
              </div>
              <Button onClick={handleLogout} variant="outline">
                Выйти
              </Button>
            </div>
          </div>

          {user && (
            <Card className="mb-8 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Добро пожаловать, {user.firstName} {user.lastName}!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Email: {user.email}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Роль: {user.role}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {error && (
            <Card className="mb-8 p-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </Card>
          )}

          {stats && <DashboardStats stats={stats} />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
              {stats && <RecentActivity transactions={stats.recentTransactions} />}
            </div>
            <div>
              <QuickActions />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Мои боты
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Управляйте подключенными Telegram ботами
              </p>
              <Link href="/dashboard/bots">
                <Button className="w-full">
                  Управление ботами
                </Button>
              </Link>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Каталог модулей
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Просмотрите доступные модули заработка
              </p>
              <Link href="/dashboard/modules">
                <Button className="w-full">
                  Открыть каталог
                </Button>
              </Link>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Статистика
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Анализируйте доходы и эффективность
              </p>
              <Link href="/dashboard/analytics">
                <Button className="w-full">
                  Посмотреть статистику
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default DashboardPage;