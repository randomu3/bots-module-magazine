import React from 'react';
import { Card } from '@/components/ui/Card';
import { Transaction } from '@/types/analytics';

interface RecentActivityProps {
  transactions: Transaction[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ transactions }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels = {
      payment: 'Платеж',
      withdrawal: 'Вывод',
      commission: 'Комиссия',
      refund: 'Возврат',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400',
      completed: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
      failed: 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400',
      cancelled: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'В обработке',
      completed: 'Завершен',
      failed: 'Ошибка',
      cancelled: 'Отменен',
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Последние операции
      </h3>
      
      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">Операций пока нет</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {getTransactionTypeLabel(transaction.type)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(transaction.createdAt)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(transaction.amount)}
                </p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                  {getStatusLabel(transaction.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};