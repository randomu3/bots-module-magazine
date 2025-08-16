import React from 'react';
import { Card } from '@/components/ui/Card';
import { Bot } from '@/types/bot';

interface BotSelectorProps {
  bots: Bot[];
  selectedBotId: string;
  onBotChange: (botId: string) => void;
}

export const BotSelector: React.FC<BotSelectorProps> = ({ 
  bots, 
  selectedBotId, 
  onBotChange 
}) => {
  const selectedBot = bots.find(bot => bot.id === selectedBotId);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Выберите бота
      </h3>
      
      <div className="space-y-2">
        {bots.map((bot) => (
          <button
            key={bot.id}
            onClick={() => onBotChange(bot.id)}
            className={`w-full text-left p-3 rounded-md transition-colors ${
              selectedBotId === bot.id
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {bot.name}
                </p>
                <p className="text-sm opacity-75 truncate">
                  @{bot.username}
                </p>
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    bot.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : bot.status === 'inactive'
                      ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {bot.status === 'active' ? 'Активен' : bot.status === 'inactive' ? 'Неактивен' : 'Заблокирован'}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {selectedBot && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            Выбранный бот
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selectedBot.name} (@{selectedBot.username})
          </p>
          {selectedBot.description && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              {selectedBot.description}
            </p>
          )}
        </div>
      )}
    </Card>
  );
};