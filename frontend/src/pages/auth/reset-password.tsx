import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';
import { Layout } from '@/components/layout/Layout';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

const ResetPasswordPage: React.FC = () => {
  const router = useRouter();
  const { token } = router.query;

  if (!token || typeof token !== 'string') {
    return (
      <>
        <Head>
          <title>Ошибка - TeleBotics</title>
        </Head>
        <Layout>
          <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Недействительная ссылка
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Ссылка для сброса пароля недействительна или истекла.
              </p>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Сброс пароля - TeleBotics</title>
        <meta name="description" content="Установите новый пароль для вашего аккаунта TeleBotics" />
      </Head>
      <Layout>
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <ResetPasswordForm token={token} />
          </div>
        </div>
        <Toaster position="top-right" />
      </Layout>
    </>
  );
};

export default ResetPasswordPage;