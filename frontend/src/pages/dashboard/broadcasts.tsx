import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BroadcastService } from '@/services/broadcastService';
import { botService } from '@/services/botService';
import { BroadcastCampaign, CreateBroadcastInput, BroadcastTarget } from '@/types/broadcast';
import { Bot } from '@/types/bot';

const BroadcastsPage: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<BroadcastCampaign[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [broadcastsData, botsData] = await Promise.all([
        BroadcastService.getBroadcasts(),
        botService.getBots()
      ]);

      setBroadcasts(broadcastsData);
      setBots(botsData);
    } catch (error) {
      console.error('Failed to load broadcast data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteBroadcast = async (id: string) => {
    try {
      await BroadcastService.executeBroadcast(id);
      loadData(); // Reload data
    } catch (error) {
      console.error('Failed to execute broadcast:', error);
    }
  };

  const handleCancelBroadcast = async (id: string) => {
    try {
      await BroadcastService.cancelBroadcast(id);
      loadData(); // Reload data
    } catch (error) {
      console.error('Failed to cancel broadcast:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'sending':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
      case 'scheduled':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'draft':
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
      case 'failed':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Отправлено';
      case 'sending':
        return 'Отправляется';
      case 'scheduled':
        return 'Запланировано';
      case 'draft':
        return 'Черновик';
      case 'failed':
        return 'Ошибка';
      case 'cancelled':
        return 'Отменено';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Рассылки
          </h1>
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={bots.length === 0}
          >
            Создать рассылку
          </Button>
        </div>

        {bots.length === 0 && (
          <Card className="p-6 mb-6">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Нет подключенных ботов</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Для создания рассылок необходимо сначала подключить хотя бы одного бота.
              </p>
            </div>
          </Card>
        )}

        {/* Broadcasts List */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              История рассылок
            </h3>
          </div>
          
          {broadcasts.length === 0 ? (
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Нет рассылок</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Создайте свою первую рассылку для взаимодействия с подписчиками.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Название
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Получателей
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Доставлено
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Дата создания
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {broadcasts.map((broadcast) => (
                    <tr key={broadcast.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {broadcast.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {broadcast.message}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(broadcast.status)}`}>
                          {getStatusText(broadcast.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {broadcast.total_recipients}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {broadcast.successful_sends} / {broadcast.total_recipients}
                        {broadcast.total_recipients > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {Math.round((broadcast.successful_sends / broadcast.total_recipients) * 100)}%
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(broadcast.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {broadcast.status === 'draft' && (
                          <Button
                            onClick={() => handleExecuteBroadcast(broadcast.id)}
                            size="sm"
                          >
                            Отправить
                          </Button>
                        )}
                        {(broadcast.status === 'draft' || broadcast.status === 'scheduled') && (
                          <Button
                            onClick={() => handleCancelBroadcast(broadcast.id)}
                            variant="outline"
                            size="sm"
                          >
                            Отменить
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Create Broadcast Modal */}
        {showCreateModal && (
          <CreateBroadcastModal
            bots={bots}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              loadData();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

// Create Broadcast Modal Component
const CreateBroadcastModal: React.FC<{
  bots: Bot[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ bots, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedBots, setSelectedBots] = useState<string[]>([]);
  const [parseMode, setParseMode] = useState<'HTML' | 'Markdown' | 'MarkdownV2'>('HTML');
  const [disableWebPagePreview, setDisableWebPagePreview] = useState(false);
  const [disableNotification, setDisableNotification] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [botSubscribers, setBotSubscribers] = useState<Record<string, any[]>>({});

  useEffect(() => {
    // Load subscribers for each bot
    const loadSubscribers = async () => {
      const subscribersData: Record<string, any[]> = {};
      for (const bot of bots) {
        try {
          const data = await BroadcastService.getBotSubscribers(bot.id);
          subscribersData[bot.id] = data.subscribers;
        } catch (error) {
          console.error(`Failed to load subscribers for bot ${bot.id}:`, error);
          subscribersData[bot.id] = [];
        }
      }
      setBotSubscribers(subscribersData);
    };

    loadSubscribers();
  }, [bots]);

  const handleBotToggle = (botId: string) => {
    setSelectedBots(prev => 
      prev.includes(botId) 
        ? prev.filter(id => id !== botId)
        : [...prev, botId]
    );
  };

  const getTotalRecipients = () => {
    return selectedBots.reduce((total, botId) => {
      return total + (botSubscribers[botId]?.length || 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (selectedBots.length === 0) {
        throw new Error('Выберите хотя бы одного бота');
      }

      const targets: BroadcastTarget[] = selectedBots.map(botId => ({
        botId,
        chatIds: botSubscribers[botId]?.map(sub => sub.chat_id) || []
      }));

      const input: CreateBroadcastInput = {
        title,
        message,
        targets,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        messageOptions: {
          parse_mode: parseMode,
          disable_web_page_preview: disableWebPagePreview,
          disable_notification: disableNotification
        }
      };

      await BroadcastService.createBroadcast(input);
      onSuccess();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Создать рассылку
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Название рассылки
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Введите название рассылки"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Сообщение
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Введите текст сообщения"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Выберите ботов для рассылки
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3">
                {bots.map((bot) => (
                  <label key={bot.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedBots.includes(bot.id)}
                      onChange={() => handleBotToggle(bot.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-900 dark:text-white">
                      {bot.name}
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        ({botSubscribers[bot.id]?.length || 0} подписчиков)
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {selectedBots.length > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Всего получателей: {getTotalRecipients()}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Формат текста
                </label>
                <select
                  value={parseMode}
                  onChange={(e) => setParseMode(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="HTML">HTML</option>
                  <option value="Markdown">Markdown</option>
                  <option value="MarkdownV2">MarkdownV2</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Запланировать отправку
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={disableWebPagePreview}
                  onChange={(e) => setDisableWebPagePreview(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900 dark:text-white">
                  Отключить предварительный просмотр ссылок
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={disableNotification}
                  onChange={(e) => setDisableNotification(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900 dark:text-white">
                  Отправить без звука
                </span>
              </label>
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={loading || selectedBots.length === 0 || !title || !message}
                className="flex-1"
              >
                {loading ? 'Создание...' : scheduledAt ? 'Запланировать' : 'Создать'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BroadcastsPage;