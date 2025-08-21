import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { botService } from '@/services/botService';
import { Bot } from '@/types/bot';

interface AddBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBotAdded: (bot: Bot) => void;
}

export const AddBotModal: React.FC<AddBotModalProps> = ({ isOpen, onClose, onBotAdded }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token.trim()) {
      setError('Введите токен бота');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const newBot = await botService.createBot({ token: token.trim() });
      onBotAdded(newBot);
      setToken('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при подключении бота');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setToken('');
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
            Подключить бота
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

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Токен бота
            </label>
            <input
              type="text"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={loading}
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Получите токен у @BotFather в Telegram
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
              disabled={loading || !token.trim()}
              className="flex-1"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Подключение...
                </div>
              ) : (
                'Подключить'
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
            Как получить токен бота:
          </h3>
          <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
            <li>1. Найдите @BotFather в Telegram</li>
            <li>2. Отправьте команду /newbot</li>
            <li>3. Следуйте инструкциям</li>
            <li>4. Скопируйте полученный токен</li>
          </ol>
        </div>
      </Card>
    </div>
  );
};