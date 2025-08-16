import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { botService } from '@/services/botService';
import { moduleService } from '@/services/moduleService';
import { Module } from '@/types/module';
import { Bot } from '@/types/bot';

interface ModuleActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: Module;
}

export const ModuleActivationModal: React.FC<ModuleActivationModalProps> = ({ 
  isOpen, 
  onClose, 
  module 
}) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [markupPercentage, setMarkupPercentage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botsLoading, setBotsLoading] = useState(true);

  useEffect(() => {
    const fetchBots = async () => {
      try {
        setBotsLoading(true);
        const botsData = await botService.getBots();
        setBots(botsData.filter(bot => bot.status === 'active'));
        if (botsData.length > 0) {
          setSelectedBotId(botsData[0].id);
        }
      } catch (err) {
        setError('Ошибка загрузки ботов');
      } finally {
        setBotsLoading(false);
      }
    };

    if (isOpen) {
      fetchBots();
    }
  }, [isOpen]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBotId) {
      setError('Выберите бота');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await moduleService.activateModule({
        botId: selectedBotId,
        moduleId: module.id,
        markupPercentage,
      });
      
      alert('Модуль успешно активирован!');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при активации модуля');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedBotId('');
      setMarkupPercentage(10);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Активация модуля
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {module.name}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
            {module.description}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {module.price === 0 ? 'Бесплатно' : formatCurrency(module.price)}
          </p>
        </div>

        {botsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : bots.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              У вас нет активных ботов для активации модуля
            </p>
            <Button variant="outline" onClick={handleClose}>
              Закрыть
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="bot" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Выберите бота
              </label>
              <select
                id="bot"
                value={selectedBotId}
                onChange={(e) => setSelectedBotId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={loading}
                required
              >
                {bots.map((bot) => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name} (@{bot.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="markup" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Наценка (%)
              </label>
              <input
                type="number"
                id="markup"
                value={markupPercentage}
                onChange={(e) => setMarkupPercentage(Number(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={loading}
                required
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Процент наценки к базовой стоимости модуля
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={loading || !selectedBotId}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Активация...
                  </div>
                ) : (
                  'Активировать'
                )}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};