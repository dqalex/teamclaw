'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, SlidersHorizontal, PackageOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, Select, Button, Spinner } from '@/shared/ui';
import { useMarketplaceStore } from '@/domains/marketplace/store';
import ServiceCard from './components/ServiceCard';
import ServiceDetailPage from './ServiceDetailPage';
import type { Service } from '@/domains/marketplace/store';
import clsx from 'clsx';

// 每页数量
const PAGE_SIZE = 12;

export default function MarketplacePage() {
  const { t } = useTranslation();
  const {
    services, total, loading, error,
    fetchServices,
  } = useMarketplaceStore();

  // 搜索/筛选状态
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('rating');
  const [page, setPage] = useState(0);

  // 详情页
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // 搜索防抖
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // 分类选项
  const CATEGORIES = useMemo(() => [
    { value: '', label: t('marketplace.categories.all') },
    { value: 'agent', label: t('marketplace.categories.agent') },
    { value: 'tool', label: t('marketplace.categories.tool') },
    { value: 'template', label: t('marketplace.categories.template') },
    { value: 'integration', label: t('marketplace.categories.integration') },
  ], [t]);

  // 排序选项
  const SORT_OPTIONS = useMemo(() => [
    { value: 'rating', label: t('marketplace.sort.rating') },
    { value: 'usage', label: t('marketplace.sort.usage') },
    { value: 'newest', label: t('marketplace.sort.newest') },
  ], [t]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(0);
    }, 500);
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value);
    setPage(0);
  }, []);

  const handleSortChange = useCallback((value: string) => {
    setSort(value);
    setPage(0);
  }, []);

  // 数据加载
  useEffect(() => {
    fetchServices({
      search: search || undefined,
      category: category || undefined,
      sort,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });
  }, [search, category, sort, page, fetchServices]);

  // 分页
  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  // 详情页模式
  if (selectedService) {
    return (
      <ServiceDetailPage
        serviceId={selectedService.id}
        onBack={() => setSelectedService(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏：搜索 + 筛选 + 排序 */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 space-y-3" style={{ background: 'var(--surface)' }}>
        {/* 标题 */}
        <div className="flex items-center gap-2 mb-2">
          <SlidersHorizontal className="w-5 h-5" style={{ color: 'var(--brand)' }} />
          <h1 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {t('marketplace.title')}
          </h1>
          {total > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-hover)', color: 'var(--text-tertiary)' }}>
              {t('marketplace.serviceCount', { count: total })}
            </span>
          )}
        </div>

        {/* 搜索栏 */}
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder={t('marketplace.searchPlaceholder')}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-md"
        />

        {/* 分类 + 排序 */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* 分类按钮组 */}
          <div className="flex items-center gap-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => handleCategoryChange(cat.value)}
                className={clsx(
                  'px-3 py-1 text-xs rounded-lg font-medium transition-colors',
                  category === cat.value
                    ? 'bg-primary-500 text-white dark:bg-primary-600'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                )}
                style={category !== cat.value ? { color: 'var(--text-secondary)' } : undefined}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 排序下拉 */}
          <Select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="text-xs py-1 w-auto ml-auto"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* 加载中 */}
        {loading && services.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {/* 错误 */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
            <Button variant="ghost" onClick={() => fetchServices({ search, category, sort, limit: PAGE_SIZE, offset: page * PAGE_SIZE })}>
              {t('marketplace.retry')}
            </Button>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && services.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <PackageOpen className="w-12 h-12" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {t('marketplace.noServices')}
            </p>
          </div>
        )}

        {/* 服务卡片网格 */}
        {!loading && services.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onClick={setSelectedService}
                />
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!hasPrev}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs px-3" style={{ color: 'var(--text-tertiary)' }}>
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

