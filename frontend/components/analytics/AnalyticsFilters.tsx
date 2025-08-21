import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AnalyticsFilters as AnalyticsFiltersType } from '@/types/analytics';

interface AnalyticsFiltersProps {
  filters: AnalyticsFiltersType;
  onFiltersChange: (filters: AnalyticsFiltersType) => void;
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({ 
  filters, 
  onFiltersChange 
}) => {
  const handleDateRangeChange = (start: string, end: string) => {
    onFiltersChange({
      ...filters,
      dateRange: { start, end },
    });
  };

  const handleGroupByChange = (groupBy: 'day' | 'week' | 'month') => {
    onFiltersChange({
      ...filters,
      groupBy,
    });
  };

  const setPresetRange = (days: number) => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    handleDateRangeChange(start, end);
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Период
        </h3>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={filters.dateRange.start === new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPresetRange(7)}
              className="text-xs"
            >
              7 дней
            </Button>
            <Button
              variant={filters.dateRange.start === new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPresetRange(30)}
              className="text-xs"
            >
              30 дней
            </Button>
            <Button
              variant={filters.dateRange.start === new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPresetRange(90)}
              className="text-xs"
            >
              90 дней
            </Button>
            <Button
              variant={filters.dateRange.start === new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPresetRange(365)}
              className="text-xs"
            >
              1 год
            </Button>
          </div>
          
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                От
              </label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => handleDateRangeChange(e.target.value, filters.dateRange.end)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                До
              </label>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => handleDateRangeChange(filters.dateRange.start, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Группировка
        </h3>
        
        <div className="space-y-2">
          <button
            onClick={() => handleGroupByChange('day')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              filters.groupBy === 'day'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            По дням
          </button>
          <button
            onClick={() => handleGroupByChange('week')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              filters.groupBy === 'week'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            По неделям
          </button>
          <button
            onClick={() => handleGroupByChange('month')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              filters.groupBy === 'month'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            По месяцам
          </button>
        </div>
      </Card>
    </div>
  );
};