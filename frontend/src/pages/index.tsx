import { NextPage } from 'next';
import Head from 'next/head';

const HomePage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Telegram Bot Modules Platform</title>
        <meta name="description" content="Platform for providing earning modules for Telegram bots" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Telegram Bot Modules Platform
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Платформа для предоставления модулей заработка в Telegram ботах
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Добро пожаловать!
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Система находится в разработке. Скоро здесь будет полнофункциональная платформа.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default HomePage;