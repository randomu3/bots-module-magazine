import { NextPage } from 'next';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const HomePage: NextPage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Монетизируйте ваших
            <span className="text-primary-600 dark:text-primary-400"> Telegram ботов</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Платформа для подключения модулей заработка к вашим Telegram ботам. 
            Увеличивайте доходы с помощью готовых решений от профессиональных разработчиков.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/auth/register">Начать бесплатно</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/modules">Посмотреть модули</Link>
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 dark:text-primary-400 text-2xl">🚀</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Быстрый запуск
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Подключите бота за несколько минут и начните зарабатывать уже сегодня
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 dark:text-primary-400 text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Детальная аналитика
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Отслеживайте доходы, конверсию и эффективность каждого модуля
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 dark:text-primary-400 text-2xl">💰</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Гибкая монетизация
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Настраивайте наценку и выбирайте оптимальные модули для вашей аудитории
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-primary-600 dark:bg-primary-700 rounded-lg p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Готовы начать зарабатывать?
          </h2>
          <p className="text-xl mb-6 opacity-90">
            Присоединяйтесь к тысячам владельцев ботов, которые уже монетизируют свою аудиторию
          </p>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/auth/register">Создать аккаунт</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;