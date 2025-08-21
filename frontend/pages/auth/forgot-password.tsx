import React from 'react';
import Head from 'next/head';
import { Toaster } from 'react-hot-toast';
import { Layout } from '@/components/layout/Layout';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

const ForgotPasswordPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Восстановление пароля - TeleBotics</title>
        <meta name="description" content="Восстановите пароль для доступа к аккаунту TeleBotics" />
      </Head>
      <Layout>
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <ForgotPasswordForm />
          </div>
        </div>
        <Toaster position="top-right" />
      </Layout>
    </>
  );
};

export default ForgotPasswordPage;