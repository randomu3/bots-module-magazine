import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BotSettingsModal } from './BotSettingsModal';
import { Bot } from '@/types/bot';
import { botService } from '@/services/botService';

interface BotListProps {
  bots: Bot[];
  onBotDeleted: (botId: string) => void;
  onBotUpdated: (bot: Bot) => void;
}

export const BotList: React.FC<BotListProps> = ({ bots, onBotDeleted, onBotUpdated }) => {
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [deletingBotId, setDeletingBotId] = useState<string | null>(null);

  const handleEditBot = (bot: Bot) => {
    setSelectedBot(bot);
    setShowSettingsModal(true);
  };

  const handleDeleteBot = async (bot: Bot) => {
    if (!confirm(`Вы уверены, что хотите удалить бота "${bot.name}"?`)) {
      return;
    }

    try {
      setDeletingBotId(bot.id);
      await botService.deleteBot(bot.id);
      onBotDeleted(bot.id);
    } catch (error) {
      alert('Ошибка при удалении бота');
    } finally {
      setDeletingBotId(null);
    }
  };

  const handleBotUpdated = (updatedBot: Bot) => {
    onBotUpdated(updatedBot);
    setShowSettingsModal(false);
    setSelectedBot(null);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
      inactive: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400',
      suspended: 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400',
    };
    return colors[status as keyof typeof colors] || colors.inactive;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      active: 'Активен',
      inactive: 'Неактивен',
      suspended: 'Заблокирован',
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (bots.length === 0) {
    return (
      <Card className="p-12 text-center">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          У вас пока нет подключенных ботов
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Подключите своего первого Telegram бота, чтобы начать использовать модули заработка
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bots.map((bot) => (
          <Card key={bot.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {bot.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{bot.username}
                  </p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bot.status)}`}>
                {getStatusLabel(bot.status)}
              </span>
            </div>

            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
              {bot.description || 'Описание не указано'}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditBot(bot)}
                >
                  Настройки
                </Button>
                <Link href={`/dashboard/bots/${bot.id}/modules`}>
                  <Button size="sm">
                    Модули
                  </Button>
                </Link>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteBot(bot)}
                disabled={deletingBotId === bot.id}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                {deletingBotId === bot.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {selectedBot && (
        <BotSettingsModal
          isOpen={showSettingsModal}
          onClose={() => {
            setShowSettingsModal(false);
            setSelectedBot(null);
          }}
          bot={selectedBot}
          onBotUpdated={handleBotUpdated}
        />
      )}
    </>
  );
};