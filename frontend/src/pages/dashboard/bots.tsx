import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BotList } from '@/components/bots/BotList';
import { AddBotModal } from '@/components/bots/AddBotModal';
import { botService } from '@/services/botService';
import { Bot } from '@/types/bot';

const BotsPage: React.FC = () => {
  const { user } = useAuth();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const fetchBots = async () => {
      try {
        setLoading(true);
        const botsData = await botService.getBots();
        setBots(botsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки ботов');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchBots();
    }
  }, [user]);

  const handleBotAdded = (newBot: Bot) => {
    setBots(prev => [...prev, newBot]);
    setShowAddModal(false);
  };

  const handleBotDeleted = (botId: string) => {
    setBots(prev => prev.filter(bot => bot.id !== botId));
  };

  const handleBotUpdated = (updatedBot: Bot) => {
    setBots(prev => prev.map(bot => bot.id === updatedBot.id ? updatedBot : bot));
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Мои боты - TeleBotics</title>
          <meta name="description" content="Управление Telegram ботами" />
        </Head>
        <DashboardLayout>
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Загрузка ботов...</p>
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
        <title>Мои боты - TeleBotics</title>
        <meta name="description" content="Управление Telegram ботами" />
      </Head>
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Мои боты
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Управляйте подключенными Telegram ботами и их модулями
                </p>
              </div>
              <div className="flex space-x-4">
                <Link href="/dashboard">
                  <Button variant="outline">
                    Назад к панели
                  </Button>
                </Link>
                <Button onClick={() => setShowAddModal(true)}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Подключить бота
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <Card className="mb-8 p-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </Card>
          )}

          <BotList 
            bots={bots}
            onBotDeleted={handleBotDeleted}
            onBotUpdated={handleBotUpdated}
          />

          <AddBotModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onBotAdded={handleBotAdded}
          />
        </div>
      </DashboardLayout>
    </>
  );
};

export default BotsPage;