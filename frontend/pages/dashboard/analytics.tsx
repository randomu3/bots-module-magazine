import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { BotSelector } from '@/components/analytics/BotSelector';
import { analyticsService } from '@/services/analyticsService';
import { botService } from '@/services/botService';
import { BotAnalytics, AnalyticsFilters as AnalyticsFiltersType } from '@/types/analytics';
import { Bot } from '@/types/bot';

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [analytics, setAnalytics] = useState<BotAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFiltersType>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
    groupBy: 'day',
  });

  useEffect(() => {
    const fetchBots = async () => {
      try {
        const botsData = await botService.getBots();
        setBots(botsData);
        if (botsData.length > 0) {
          setSelectedBotId(botsData[0].id);
        }
      } catch (err) {
        setError('Ошибка загрузки ботов');
      }
    };

    if (user) {
      fetchBots();
    }
  }, [user]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!selectedBotId) return;

      try {
        setLoading(true);
        const analyticsData = await analyticsService.getBotAnalytics(selectedBotId, filters);
        setAnalytics(analyticsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки аналитики');
      } finally {
        setLoading(false);
      }
    };

    if (selectedBotId) {
      fetchAnalytics();
    }
  }, [selectedBotId, filters]);

  const handleFiltersChange = (newFilters: AnalyticsFiltersType) => {
    setFilters(newFilters);
  };

  const handleBotChange = (botId: string) => {
    setSelectedBotId(botId);
  };

  if (loading && !analytics) {
    return (
      <>
        <Head>
          <title>Аналитика - TeleBotics</title>
          <meta name="description" content="Аналитика доходов и статистика ботов" />
        </Head>
        <DashboardLayout>
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Загрузка аналитики...</p>
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
        <title>Аналитика - TeleBotics</title>
        <meta name="description" content="Аналитика доходов и статистика ботов" />
      </Head>
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Аналитика
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Анализируйте доходы и эффективность ваших ботов
                </p>
              </div>
              <Link href="/dashboard">
                <Button variant="outline">
                  Назад к панели
                </Button>
              </Link>
            </div>
          </div>

          {error && (
            <Card className="mb-8 p-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </Card>
          )}

          {bots.length === 0 ? (
            <Card className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                У вас пока нет ботов
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Подключите бота, чтобы начать отслеживать аналитику
              </p>
              <Link href="/dashboard/bots">
                <Button>
                  Подключить бота
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                  <BotSelector
                    bots={bots}
                    selectedBotId={selectedBotId}
                    onBotChange={handleBotChange}
                  />
                  <div className="mt-6">
                    <AnalyticsFilters
                      filters={filters}
                      onFiltersChange={handleFiltersChange}
                    />
                  </div>
                </div>
                <div className="lg:col-span-3">
                  {analytics && (
                    <AnalyticsCharts 
                      analytics={analytics} 
                      loading={loading}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
};

export default AnalyticsPage;