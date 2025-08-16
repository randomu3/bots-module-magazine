import React, { useEffect, useState } from 'react';
import AdminRoute from '@/components/admin/AdminRoute';
import AdminLayout from '@/components/layout/AdminLayout';
import { adminService, AdminWithdrawal } from '@/services/adminService';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CogIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

const AdminWithdrawals: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<AdminWithdrawal | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processAction, setProcessAction] = useState<'approve' | 'reject'>('approve');
  const [processNotes, setProcessNotes] = useState('');

  const limit = 20;

  useEffect(() => {
    loadWithdrawals();
  }, [currentPage, statusFilter]);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const result = await adminService.getWithdrawals({
        page: currentPage,
        limit,
        status: statusFilter || undefined,
      });
      setWithdrawals(result.withdrawals);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (err) {
      setError('Не удалось загрузить заявки на выплаты');
      console.error('Failed to load withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessWithdrawal = async () => {
    if (!selectedWithdrawal) return;

    try {
      await adminService.processWithdrawal(selectedWithdrawal.id, processAction, processNotes);
      setShowProcessModal(false);
      setProcessNotes('');
      setSelectedWithdrawal(null);
      await loadWithdrawals();
    } catch (err) {
      console.error('Failed to process withdrawal:', err);
      alert('Не удалось обработать заявку на выплату');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'RUB') => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Выполнена
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircleIcon className="w-3 h-3 mr-1" />
            Отклонена
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <CogIcon className="w-3 h-3 mr-1" />
            В обработке
          </span>
        );
      default: // pending
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <ClockIcon className="w-3 h-3 mr-1" />
            Ожидает
          </span>
        );
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      bank_transfer: 'Банковский перевод',
      card: 'Банковская карта',
      qiwi: 'QIWI',
      yandex_money: 'ЮMoney',
      webmoney: 'WebMoney',
      paypal: 'PayPal',
    };
    return labels[method as keyof typeof labels] || method;
  };

  if (loading && withdrawals.length === 0) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Управление выплатами
              </h1>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Всего заявок: {total}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Статус
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Все статусы</option>
                  <option value="pending">Ожидают обработки</option>
                  <option value="processing">В обработке</option>
                  <option value="completed">Выполненные</option>
                  <option value="rejected">Отклоненные</option>
                </select>
              </div>
            </div>
          </div>

          {/* Withdrawals Table */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Пользователь
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Сумма
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Способ выплаты
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Дата создания
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Дата обработки
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                              <BanknotesIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {withdrawal.userEmail}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {withdrawal.userId.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(withdrawal.amount, withdrawal.currency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {getPaymentMethodLabel(withdrawal.paymentMethod)}
                        </div>
                        {withdrawal.paymentDetails && Object.keys(withdrawal.paymentDetails).length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {Object.entries(withdrawal.paymentDetails).map(([key, value]) => (
                              <div key={key}>
                                {key}: {typeof value === 'string' ? value.replace(/(.{4})/g, '$1 ') : String(value)}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(withdrawal.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(withdrawal.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {withdrawal.processedAt ? formatDate(withdrawal.processedAt) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {withdrawal.status === 'pending' && (
                            <button
                              onClick={() => {
                                setSelectedWithdrawal(withdrawal);
                                setShowProcessModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Обработать"
                            >
                              <CogIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    Предыдущая
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    Следующая
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Показано{' '}
                      <span className="font-medium">{(currentPage - 1) * limit + 1}</span>
                      {' '}-{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * limit, total)}
                      </span>
                      {' '}из{' '}
                      <span className="font-medium">{total}</span>
                      {' '}результатов
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                      >
                        Предыдущая
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-200'
                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                      >
                        Следующая
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Process Withdrawal Modal */}
          {showProcessModal && selectedWithdrawal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                          Обработка заявки на выплату
                        </h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <strong>Пользователь:</strong> {selectedWithdrawal.userEmail}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <strong>Сумма:</strong> {formatCurrency(selectedWithdrawal.amount, selectedWithdrawal.currency)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <strong>Способ выплаты:</strong> {getPaymentMethodLabel(selectedWithdrawal.paymentMethod)}
                          </p>
                          {selectedWithdrawal.paymentDetails && Object.keys(selectedWithdrawal.paymentDetails).length > 0 && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              <strong>Реквизиты:</strong>
                              {Object.entries(selectedWithdrawal.paymentDetails).map(([key, value]) => (
                                <div key={key} className="ml-2">
                                  {key}: {String(value)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="mt-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Действие
                            </label>
                            <select
                              value={processAction}
                              onChange={(e) => setProcessAction(e.target.value as 'approve' | 'reject')}
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                              <option value="approve">Одобрить выплату</option>
                              <option value="reject">Отклонить заявку</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Комментарий {processAction === 'reject' ? '(обязательно)' : '(необязательно)'}
                            </label>
                            <textarea
                              value={processNotes}
                              onChange={(e) => setProcessNotes(e.target.value)}
                              rows={3}
                              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              placeholder={
                                processAction === 'reject'
                                  ? 'Укажите причину отклонения...'
                                  : 'Дополнительные комментарии...'
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      onClick={handleProcessWithdrawal}
                      disabled={processAction === 'reject' && !processNotes.trim()}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {processAction === 'approve' ? 'Одобрить' : 'Отклонить'}
                    </button>
                    <button
                      onClick={() => {
                        setShowProcessModal(false);
                        setProcessNotes('');
                        setSelectedWithdrawal(null);
                      }}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </AdminRoute>
  );
};

export default AdminWithdrawals;