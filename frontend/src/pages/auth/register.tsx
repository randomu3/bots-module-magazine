import React from 'react';
import Head from 'next/head';
import { Toaster } from 'react-hot-toast';
import { Layout } from '@/components/layout/Layout';
import { RegisterForm } from '@/components/auth/RegisterForm';

const RegisterPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Регистрация - TeleBotics</title>
        <meta name="description" content="Создайте аккаунт TeleBotics для управления Telegram ботами" />
      </Head>
      <Layout>
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <RegisterForm />
          </div>
        </div>
        <Toaster position="top-right" />
      </Layout>
    </>
  );
};

export default RegisterPage;