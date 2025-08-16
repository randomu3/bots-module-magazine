import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ModuleCategory, ModuleFilters as ModuleFiltersType } from '@/types/module';

interface ModuleFiltersProps {
  categories: ModuleCategory[];
  filters: ModuleFiltersType;
  onFiltersChange: (filters: ModuleFiltersType) => void;
}

export const ModuleFilters: React.FC<ModuleFiltersProps> = ({ 
  categories, 
  filters, 
  onFiltersChange 
}) => {
  const handleCategoryChange = (category: string) => {
    onFiltersChange({
      ...filters,
      category: filters.category === category ? undefined : category,
    });
  };

  const handleSearchChange = (search: string) => {
    onFiltersChange({
      ...filters,
      search: search || undefined,
    });
  };

  const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    onFiltersChange({
      ...filters,
      sortBy: sortBy as any,
      sortOrder,
    });
  };

  const handlePriceRangeChange = (min: number, max: number) => {
    onFiltersChange({
      ...filters,
      priceRange: min === 0 && max === 10000 ? undefined : { min, max },
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      sortBy: 'name',
      sortOrder: 'asc',
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Поиск
        </h3>
        <input
          type="text"
          placeholder="Поиск модулей..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Категории
        </h3>
        <div className="space-y-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.name)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                filters.category === category.name
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{category.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {category.moduleCount}
                </span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Цена
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => handlePriceRangeChange(0, 0)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              filters.priceRange?.min === 0 && filters.priceRange?.max === 0
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Бесплатные
          </button>
          <button
            onClick={() => handlePriceRangeChange(1, 1000)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              filters.priceRange?.min === 1 && filters.priceRange?.max === 1000
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            До 1,000 ₽
          </button>
          <button
            onClick={() => handlePriceRangeChange(1000, 5000)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              filters.priceRange?.min === 1000 && filters.priceRange?.max === 5000
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            1,000 - 5,000 ₽
          </button>
          <button
            onClick={() => handlePriceRangeChange(5000, 10000)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              filters.priceRange?.min === 5000 && filters.priceRange?.max === 10000
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Свыше 5,000 ₽
          </button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Сортировка
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => handleSortChange('name', 'asc')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              filters.sortBy === 'name' && filters.sortOrder === 'asc'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            По названию (А-Я)
          </button>
          <button
            onClick={() => handleSortChange('price', 'asc')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              filters.sortBy === 'price' && filters.sortOrder === 'asc'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            По цене (возрастание)
          </button>
          <button
            onClick={() => handleSortChange('price', 'desc')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              filters.sortBy === 'price' && filters.sortOrder === 'desc'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            По цене (убывание)
          </button>
          <button
            onClick={() => handleSortChange('rating', 'desc')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              filters.sortBy === 'rating' && filters.sortOrder === 'desc'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            По рейтингу
          </button>
        </div>
      </Card>

      <Button variant="outline" onClick={clearFilters} className="w-full">
        Сбросить фильтры
      </Button>
    </div>
  );
};