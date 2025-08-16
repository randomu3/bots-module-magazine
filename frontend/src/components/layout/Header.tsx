import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TB</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              TeleBotics
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/modules" 
              className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Модули
            </Link>
            <Link 
              href="/pricing" 
              className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Тарифы
            </Link>
            <Link 
              href="/docs" 
              className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Документация
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/login">Войти</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register">Регистрация</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};