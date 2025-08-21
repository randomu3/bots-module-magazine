import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';
import { Layout } from '@/components/layout/Layout';
import { EmailVerification } from '@/components/auth/EmailVerification';

const VerifyEmailPage: React.FC = () => {
  const router = useRouter();
  const { token, email } = router.query;

  return (
    <>
      <Head>
        <title>Подтверждение email - TeleBotics</title>
        <meta name="description" content="Подтвердите ваш email адрес для активации аккаунта TeleBotics" />
      </Head>
      <Layout>
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <EmailVerification 
              token={typeof token === 'string' ? token : undefined}
              email={typeof email === 'string' ? email : undefined}
            />
          </div>
        </div>
        <Toaster position="top-right" />
      </Layout>
    </>
  );
};

export default VerifyEmailPage;