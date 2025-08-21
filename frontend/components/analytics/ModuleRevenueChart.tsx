import React from 'react';
import { ModuleRevenueData } from '@/types/analytics';

interface ModuleRevenueChartProps {
  data: ModuleRevenueData[];
}

export const ModuleRevenueChart: React.FC<ModuleRevenueChartProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const maxRevenue = Math.max(...data.map(d => d.revenue));
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        Нет данных для отображения
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((module, index) => {
        const percentage = (module.revenue / maxRevenue) * 100;
        const color = colors[index % colors.length];
        
        return (
          <div key={module.moduleId} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {module.moduleName}
                </span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(module.revenue)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {module.transactions} транзакций
                </div>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: color
                }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Конверсия: {formatPercentage(module.conversionRate)}</span>
              <span>{percentage.toFixed(1)}% от общего дохода</span>
            </div>
          </div>
        );
      })}
      
      {data.length > 5 && (
        <div className="text-center pt-4">
          <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
            Показать все модули
          </button>
        </div>
      )}
    </div>
  );
};