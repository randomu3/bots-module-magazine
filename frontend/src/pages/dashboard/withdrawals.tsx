import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FinanceService } from '@/services/financeService';
import { Transaction, WithdrawalRequest, WithdrawalLimits } from '@/types/finance';

const WithdrawalsPage: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<Transaction[]>([]);
  const [limits, setLimits] = useState<WithdrawalLimits | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [withdrawalsData, limitsData, balanceData] = await Promise.all([
        FinanceService.getWithdrawalHistory(currentPage, 10),
        FinanceService.getWithdrawalLimits(),
        FinanceService.getUserBalance()
      ]);

      setWithdrawals(withdrawalsData.withdrawals);
      setTotal(withdrawalsData.total);
      setLimits(limitsData);
      setBalance(balanceData.balance);
    } catch (error) {
      console.error('Failed to load withdrawal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelWithdrawal = async (transactionId: string) => {
    try {
      await FinanceService.cancelWithdrawal(transactionId);
      loadData(); // Reload data
    } catch (error) {
      console.error('Failed to cancel withdrawal:', error);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'failed':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
            Управление выплатами
          </h1>
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={!limits || balance < limits.minAmount}
          >
            Создать заявку на вывод
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Доступно для вывода</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatAmount(balance)}
                </p>
              </div>
            </div>
          </Card>

          {limits && (
            <>
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Минимальная сумма</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatAmount(limits.minAmount)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Комиссия</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {limits.commission}%
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Withdrawal Limits Info */}
        {limits && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Лимиты на вывод средств
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Минимальная сумма</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formatAmount(limits.minAmount)}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Максимальная сумма</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formatAmount(limits.maxAmount)}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Дневной лимит</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formatAmount(limits.dailyLimit)}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Месячный лимит</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formatAmount(limits.monthlyLimit)}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Withdrawals History */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              История выплат
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Метод
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Дата создания
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatAmount(withdrawal.amount)}
                        </div>
                        {withdrawal.metadata?.commission_amount && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Комиссия: {formatAmount(withdrawal.metadata.commission_amount)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {withdrawal.metadata?.withdrawal_method === 'bank_transfer' && 'Банковский перевод'}
                      {withdrawal.metadata?.withdrawal_method === 'paypal' && 'PayPal'}
                      {withdrawal.metadata?.withdrawal_method === 'crypto' && 'Криптовалюта'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(withdrawal.status)}`}>
                        {withdrawal.status === 'completed' && 'Завершено'}
                        {withdrawal.status === 'pending' && 'В обработке'}
                        {withdrawal.status === 'failed' && 'Отклонено'}
                        {withdrawal.status === 'cancelled' && 'Отменено'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(withdrawal.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {withdrawal.status === 'pending' && (
                        <Button
                          onClick={() => handleCancelWithdrawal(withdrawal.id)}
                          variant="outline"
                          size="sm"
                        >
                          Отменить
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 10 && (
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
                  disabled={currentPage * 10 >= total}
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
                      {(currentPage - 1) * 10 + 1}
                    </span>{' '}
                    -{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * 10, total)}
                    </span>{' '}
                    из{' '}
                    <span className="font-medium">{total}</span>{' '}
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
                      disabled={currentPage * 10 >= total}
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

        {/* Create Withdrawal Modal */}
        {showCreateModal && (
          <CreateWithdrawalModal
            balance={balance}
            limits={limits!}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              loadData();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

// Create Withdrawal Modal Component
const CreateWithdrawalModal: React.FC<{
  balance: number;
  limits: WithdrawalLimits;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ balance, limits, onClose, onSuccess }) => {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'bank_transfer' | 'paypal' | 'crypto'>('bank_transfer');
  const [details, setDetails] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const withdrawalAmount = parseFloat(amount);
      
      if (withdrawalAmount < limits.minAmount) {
        throw new Error(`Минимальная сумма для вывода: ${limits.minAmount}`);
      }
      
      if (withdrawalAmount > balance) {
        throw new Error('Недостаточно средств');
      }

      const request: WithdrawalRequest = {
        amount: withdrawalAmount,
        method,
        details
      };

      await FinanceService.createWithdrawal(request);
      onSuccess();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateNetAmount = () => {
    const withdrawalAmount = parseFloat(amount) || 0;
    const commission = (withdrawalAmount * limits.commission) / 100;
    return withdrawalAmount - commission;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Создать заявку на вывод
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Сумма для вывода
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={limits.minAmount}
              max={Math.min(balance, limits.maxAmount)}
              step="0.01"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Доступно: {formatAmount(balance)}
            </p>
          </div>

          {amount && (
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              <div className="flex justify-between text-sm">
                <span>Сумма к выводу:</span>
                <span>{formatAmount(parseFloat(amount) || 0)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Комиссия ({limits.commission}%):</span>
                <span>-{formatAmount(((parseFloat(amount) || 0) * limits.commission) / 100)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                <span>К получению:</span>
                <span>{formatAmount(calculateNetAmount())}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Метод вывода
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="bank_transfer">Банковский перевод</option>
              <option value="paypal">PayPal</option>
              <option value="crypto">Криптовалюта</option>
            </select>
          </div>

          {method === 'bank_transfer' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Номер счета"
                value={details.bankAccount?.accountNumber || ''}
                onChange={(e) => setDetails({
                  ...details,
                  bankAccount: { ...details.bankAccount, accountNumber: e.target.value }
                })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <input
                type="text"
                placeholder="Routing number"
                value={details.bankAccount?.routingNumber || ''}
                onChange={(e) => setDetails({
                  ...details,
                  bankAccount: { ...details.bankAccount, routingNumber: e.target.value }
                })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <input
                type="text"
                placeholder="Имя владельца счета"
                value={details.bankAccount?.accountHolderName || ''}
                onChange={(e) => setDetails({
                  ...details,
                  bankAccount: { ...details.bankAccount, accountHolderName: e.target.value }
                })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {method === 'paypal' && (
            <input
              type="email"
              placeholder="PayPal email"
              value={details.paypal?.email || ''}
              onChange={(e) => setDetails({
                ...details,
                paypal: { email: e.target.value }
              })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          )}

          {method === 'crypto' && (
            <div className="space-y-3">
              <select
                value={details.crypto?.currency || ''}
                onChange={(e) => setDetails({
                  ...details,
                  crypto: { ...details.crypto, currency: e.target.value }
                })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Выберите валюту</option>
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="USDT">Tether (USDT)</option>
              </select>
              <input
                type="text"
                placeholder="Адрес кошелька"
                value={details.crypto?.address || ''}
                onChange={(e) => setDetails({
                  ...details,
                  crypto: { ...details.crypto, address: e.target.value }
                })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={loading || !amount || parseFloat(amount) < limits.minAmount}
              className="flex-1"
            >
              {loading ? 'Создание...' : 'Создать заявку'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawalsPage;