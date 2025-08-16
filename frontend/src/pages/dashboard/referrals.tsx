import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReferralService } from '@/services/referralService';
import { ReferralStats, ReferralList, ReferralProgramInfo, ReferralTier } from '@/types/referral';

const ReferralsPage: React.FC = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralList, setReferralList] = useState<ReferralList | null>(null);
  const [programInfo, setProgramInfo] = useState<ReferralProgramInfo | null>(null);
  const [userTier, setUserTier] = useState<ReferralTier | null>(null);
  const [referralLink, setReferralLink] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, referralListData, programInfoData, tierData, linkData] = await Promise.all([
        ReferralService.getReferralStats(),
        ReferralService.getReferralList(currentPage, 10),
        ReferralService.getProgramInfo(),
        ReferralService.getUserTier(),
        ReferralService.getReferralLink()
      ]);

      setStats(statsData);
      setReferralList(referralListData);
      setProgramInfo(programInfoData);
      setUserTier(tierData);
      setReferralLink(linkData.referralLink);
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTierColor = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'bronze':
        return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20';
      case 'silver':
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
      case 'gold':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'platinum':
        return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20';
      case 'diamond':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Партнерская программа
          </h1>
          {userTier && (
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getTierColor(userTier.name)}`}>
              {userTier.name} - {userTier.commissionRate}%
            </span>
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Всего рефералов</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalReferrals}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Активных</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.activeReferrals}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Заработано всего</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatAmount(stats.totalCommissionEarned)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">За этот месяц</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatAmount(stats.thisMonthCommission)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Referral Link */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Ваша реферальная ссылка
            </h3>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <Button onClick={copyReferralLink} variant="outline">
                {copied ? 'Скопировано!' : 'Копировать'}
              </Button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Поделитесь этой ссылкой с друзьями и получайте комиссию с их покупок
            </p>
          </Card>

          {/* Current Tier Info */}
          {userTier && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Ваш текущий уровень
              </h3>
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getTierColor(userTier.name)}`}>
                  {userTier.name}
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {userTier.commissionRate}% + {userTier.bonusRate}%
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>Комиссия: {userTier.commissionRate}%</p>
                <p>Бонус: {userTier.bonusRate}%</p>
                <p>Минимум рефералов: {userTier.minReferrals}</p>
              </div>
            </Card>
          )}
        </div>

        {/* Tier Progression */}
        {programInfo && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Уровни партнерской программы
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {programInfo.tiers.map((tier, index) => (
                <div
                  key={tier.name}
                  className={`p-4 rounded-lg border-2 ${
                    userTier?.name === tier.name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="text-center">
                    <h4 className={`font-semibold mb-2 ${getTierColor(tier.name).split(' ')[0]}`}>
                      {tier.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {tier.minReferrals}+ рефералов
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {tier.commissionRate}%
                    </p>
                    {tier.bonusRate > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        +{tier.bonusRate}% бонус
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Referrals List */}
        {referralList && (
          <Card>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ваши рефералы
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Пользователь
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Потратил
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ваша комиссия
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Дата регистрации
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {referralList.referrals.map((referral) => (
                    <tr key={referral.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {referral.firstName} {referral.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {referral.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          referral.emailVerified
                            ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
                            : 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20'
                        }`}>
                          {referral.emailVerified ? 'Активен' : 'Не подтвержден'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatAmount(referral.totalSpent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                        {formatAmount(referral.commissionEarned)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(referral.registeredAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {referralList.pagination.pages > 1 && (
              <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    variant="outline"
                  >
                    Назад
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= referralList.pagination.pages}
                    variant="outline"
                  >
                    Вперед
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Показано{' '}
                      <span className="font-medium">
                        {(currentPage - 1) * referralList.pagination.limit + 1}
                      </span>{' '}
                      -{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * referralList.pagination.limit, referralList.total)}
                      </span>{' '}
                      из{' '}
                      <span className="font-medium">{referralList.total}</span>{' '}
                      результатов
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <Button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        variant="outline"
                        className="rounded-r-none"
                      >
                        Назад
                      </Button>
                      <Button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage >= referralList.pagination.pages}
                        variant="outline"
                        className="rounded-l-none"
                      >
                        Вперед
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReferralsPage;