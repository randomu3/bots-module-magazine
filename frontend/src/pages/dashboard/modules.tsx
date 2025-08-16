import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ModuleCatalog } from '@/components/modules/ModuleCatalog';
import { ModuleFilters } from '@/components/modules/ModuleFilters';
import { moduleService } from '@/services/moduleService';
import { Module, ModuleCategory, ModuleFilters as ModuleFiltersType } from '@/types/module';

const ModulesPage: React.FC = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [categories, setCategories] = useState<ModuleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ModuleFiltersType>({
    sortBy: 'name',
    sortOrder: 'asc',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [modulesData, categoriesData] = await Promise.all([
          moduleService.getModules(filters),
          moduleService.getCategories(),
        ]);
        setModules(modulesData);
        setCategories(categoriesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, filters]);

  const handleFiltersChange = (newFilters: ModuleFiltersType) => {
    setFilters(newFilters);
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Каталог модулей - TeleBotics</title>
          <meta name="description" content="Каталог модулей заработка для Telegram ботов" />
        </Head>
        <DashboardLayout>
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Загрузка модулей...</p>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Каталог модулей - TeleBotics</title>
        <meta name="description" content="Каталог модулей заработка для Telegram ботов" />
      </Head>
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Каталог модулей
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Найдите и активируйте модули заработка для ваших ботов
                </p>
              </div>
              <Link href="/dashboard">
                <Button variant="outline">
                  Назад к панели
                </Button>
              </Link>
            </div>
          </div>

          {error && (
            <Card className="mb-8 p-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <ModuleFilters
                categories={categories}
                filters={filters}
                onFiltersChange={handleFiltersChange}
              />
            </div>
            <div className="lg:col-span-3">
              <ModuleCatalog modules={modules} />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default ModulesPage;