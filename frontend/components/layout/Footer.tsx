import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TB</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                TeleBotics
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-md">
              Платформа для предоставления модулей заработка в Telegram ботах. 
              Создавайте, подключайте и монетизируйте ваших ботов легко и эффективно.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Быстрые ссылки
            </h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/modules" 
                  className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Каталог модулей
                </Link>
              </li>
              <li>
                <Link 
                  href="/docs" 
                  className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Документация
                </Link>
              </li>
              <li>
                <Link 
                  href="/support" 
                  className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Поддержка
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Правовая информация
            </h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/privacy" 
                  className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms" 
                  className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Условия использования
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-8">
          <p className="text-center text-gray-600 dark:text-gray-300">
            © {new Date().getFullYear()} TeleBotics. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
};