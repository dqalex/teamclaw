'use client';

import { useState, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

// ============================================================
// 类型定义
// ============================================================

export interface Column<T> {
  /** 列唯一标识，作为排序/筛选的 key */
  key: string;
  /** 列标题 */
  header: string | ReactNode;
  /** 渲染单元格内容 */
  render?: (row: T, index: number) => ReactNode;
  /** 获取单元格排序值（不传则用 render 的文本内容） */
  getSortValue?: (row: T) => string | number | null | undefined;
  /** 列宽度（CSS 值） */
  width?: string;
  /** 最小列宽（CSS 值） */
  minWidth?: string;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 是否可排序 */
  sortable?: boolean;
  /** 是否隐藏（响应式场景） */
  hidden?: boolean;
}

export interface PaginationConfig {
  /** 每页可选条数 */
  pageSizeOptions?: number[];
  /** 默认每页条数 */
  defaultPageSize?: number;
}

export interface DataTableProps<T> {
  /** 列定义 */
  columns: Column<T>[];
  /** 数据源 */
  data: T[];
  /** 行唯一标识 key */
  rowKey?: keyof T | ((row: T) => string);
  /** 是否可选行 */
  selectable?: boolean;
  /** 是否可排序（列级别也可单独控制） */
  sortable?: boolean;
  /** 是否可筛选（显示搜索框） */
  filterable?: boolean;
  /** 分页配置 */
  pagination?: PaginationConfig | false;
  /** 筛选 placeholder */
  filterPlaceholder?: string;
  /** 行点击回调 */
  onRowClick?: (row: T, index: number) => void;
  /** 选中行变化回调 */
  onSelectionChange?: (selectedRows: T[]) => void;
  /** 空状态内容 */
  emptyState?: ReactNode;
  /** 加载状态 */
  loading?: boolean;
  /** 紧凑模式 */
  compact?: boolean;
  /** 额外 className */
  className?: string;
  /** 头部工具栏 */
  toolbar?: ReactNode;
}

type SortDirection = 'asc' | 'desc' | null;
type SortState = { key: string; direction: SortDirection };

// ============================================================
// 子组件
// ============================================================

/** 排序图标 */
function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === 'asc') return <ChevronUp className="w-3.5 h-3.5" />;
  if (direction === 'desc') return <ChevronDown className="w-3.5 h-3.5" />;
  return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />;
}

/** 分页组件 */
function Pagination({
  currentPage,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
}: {
  currentPage: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions: number[];
}) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
      {/* 左侧：总数 + 每页条数 */}
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>
          {t('dataTable.showing', '显示')} <b>{start}</b>-<b>{end}</b> / <b>{total}</b>
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 text-xs rounded-md border bg-transparent outline-none focus:ring-2"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            ['--tw-ring-color' as string]: 'var(--brand-subtle)',
          }}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} {t('dataTable.perPage', '条/页')}
            </option>
          ))}
        </select>
      </div>

      {/* 右侧：页码导航 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-md transition-colors disabled:opacity-30"
          style={{ color: 'var(--text-secondary)' }}
          title={t('dataTable.firstPage', '首页')}
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-md transition-colors disabled:opacity-30"
          style={{ color: 'var(--text-secondary)' }}
          title={t('dataTable.prevPage', '上一页')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 页码按钮 */}
        {getVisiblePages(currentPage, totalPages).map((page, idx) =>
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={clsx(
                'w-8 h-8 text-xs font-medium rounded-md transition-colors',
                currentPage === page
                  ? 'text-white'
                  : 'hover:bg-[var(--surface-hover)]'
              )}
              style={{
                color: currentPage === page ? undefined : 'var(--text-secondary)',
                background: currentPage === page ? 'var(--brand)' : undefined,
              }}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-md transition-colors disabled:opacity-30"
          style={{ color: 'var(--text-secondary)' }}
          title={t('dataTable.nextPage', '下一页')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-md transition-colors disabled:opacity-30"
          style={{ color: 'var(--text-secondary)' }}
          title={t('dataTable.lastPage', '末页')}
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/** 计算可见页码 */
function getVisiblePages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

// ============================================================
// 主组件 DataTable
// ============================================================

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  selectable = false,
  sortable = true,
  filterable = false,
  pagination: paginationConfig,
  filterPlaceholder,
  onRowClick,
  onSelectionChange,
  emptyState,
  loading = false,
  compact = false,
  className,
  toolbar,
}: DataTableProps<T>) {
  const { t } = useTranslation();

  // 排序状态
  const [sort, setSort] = useState<SortState>({ key: '', direction: null });
  // 搜索状态
  const [search, setSearch] = useState('');
  // 分页状态
  const defaultPageSize = paginationConfig === false ? 20 : (paginationConfig?.defaultPageSize ?? 10);
  const pageSizeOptions = paginationConfig === false ? [20] : (paginationConfig?.pageSizeOptions ?? [10, 20, 50, 100]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  // 选中行
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  // 搜索输入防抖 ref
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 获取行唯一 key
  const getRowKey = useCallback((row: T) => {
    if (rowKey) {
      if (typeof rowKey === 'function') return rowKey(row);
      return String(row[rowKey] ?? Math.random());
    }
    return JSON.stringify(row);
  }, [rowKey]);

  // 过滤数据
  const filteredData = useMemo(() => {
    if (!debouncedSearch.trim()) return data;
    const keyword = debouncedSearch.toLowerCase().trim();
    return data.filter((row) =>
      columns.some((col) => {
        const value = col.getSortValue?.(row) ?? col.render?.(row, 0) ?? row[col.key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(keyword);
      })
    );
  }, [data, columns, debouncedSearch]);

  // 排序数据
  const sortedData = useMemo(() => {
    if (!sort.key || !sort.direction) return filteredData;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = col.getSortValue?.(a) ?? (col.render ? String(col.render(a, 0)) : a[col.key]);
      const bVal = col.getSortValue?.(b) ?? (col.render ? String(col.render(b, 0)) : b[col.key]);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sort, columns]);

  // 分页数据
  const paginatedData = useMemo(() => {
    if (paginationConfig === false) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, paginationConfig]);

  // 搜索防抖
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setCurrentPage(1);
    }, 300);
  }, []);

  // 排序处理
  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev.key === key) {
        const next: SortState = { key, direction: prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc' };
        if (next.direction === null) return { key: '', direction: null };
        return next;
      }
      return { key, direction: 'asc' };
    });
  }, []);

  // 全选/取消全选
  const allKeys = useMemo(() => paginatedData.map(getRowKey), [paginatedData, getRowKey]);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeys.has(k));

  const handleSelectAll = useCallback(() => {
    const newKeys = allSelected ? new Set<string>() : new Set(allKeys);
    setSelectedKeys(newKeys);
    if (onSelectionChange) {
      onSelectionChange(newKeys.size === 0 ? [] : data.filter((r) => newKeys.has(getRowKey(r))));
    }
  }, [allSelected, allKeys, onSelectionChange, data, getRowKey]);

  const handleSelectRow = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const newKeys = new Set(prev);
      if (newKeys.has(key)) newKeys.delete(key);
      else newKeys.add(key);
      if (onSelectionChange) {
        onSelectionChange(data.filter((r) => newKeys.has(getRowKey(r))));
      }
      return newKeys;
    });
  }, [onSelectionChange, data, getRowKey]);

  // 分页变化
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // 可见列（排除 hidden）
  const visibleColumns = useMemo(() => columns.filter((c) => !c.hidden), [columns]);

  return (
    <div
      className={clsx('rounded-xl border overflow-hidden', className)}
      style={{
        borderColor: 'var(--border)',
        background: 'var(--surface)',
      }}
    >
      {/* 工具栏 + 搜索 */}
      {(filterable || toolbar) && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">{toolbar}</div>
          {filterable && (
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={filterPlaceholder ?? t('dataTable.search', '搜索...')}
                className="pl-8 pr-8 py-1.5 text-sm rounded-lg border bg-transparent outline-none focus:ring-2 w-56 transition-[width] focus:w-72"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                  ['--tw-ring-color' as string]: 'var(--brand-subtle)',
                }}
              />
              {search && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--surface-hover)]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 表格 */}
      <div className="overflow-auto">
        <table className="w-full caption-bottom text-sm" style={{ minWidth: '100%' }}>
          {/* 表头 */}
          <thead>
            <tr
              className="border-b transition-colors"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-hover)' }}
            >
              {selectable && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="rounded border cursor-pointer"
                    style={{ borderColor: 'var(--border)' }}
                  />
                </th>
              )}
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={sortable && col.sortable !== false ? () => handleSort(col.key) : undefined}
                  className={clsx(
                    'px-4 py-3 text-left align-middle font-semibold text-xs uppercase tracking-wide whitespace-nowrap',
                    (sortable && col.sortable !== false) && 'cursor-pointer select-none hover:text-[var(--text-primary)]'
                  )}
                  style={{
                    color: 'var(--text-tertiary)',
                    width: col.width,
                    minWidth: col.minWidth,
                    textAlign: col.align ?? 'left',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {(sortable && col.sortable !== false) && (
                      <SortIcon direction={sort.key === col.key ? sort.direction : null} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* 表体 */}
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  className="py-16 text-center"
                >
                  <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" style={{ color: 'var(--brand)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t('dataTable.loading', '加载中...')}
                  </span>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  className="py-16 text-center"
                >
                  {emptyState ?? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">📭</span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {t('dataTable.noData', '暂无数据')}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const key = getRowKey(row);
                const isSelected = selectedKeys.has(key);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row, idx) : undefined}
                    className={clsx(
                      'border-b transition-all duration-[var(--duration-fast,150ms)]',
                      onRowClick && 'cursor-pointer',
                      isSelected && 'border-l-2'
                    )}
                    style={{
                      borderColor: isSelected ? undefined : 'var(--border)',
                      borderLeftColor: isSelected ? 'var(--brand)' : undefined,
                      background: isSelected ? 'var(--brand-light)' : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLElement).style.background = '';
                      }
                    }}
                  >
                    {selectable && (
                      <td className="w-10 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(key)}
                          className="rounded border cursor-pointer"
                          style={{ borderColor: 'var(--border)' }}
                        />
                      </td>
                    )}
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={clsx('px-4 text-sm', compact ? 'py-2' : 'py-3')}
                        style={{
                          color: 'var(--text-primary)',
                          textAlign: col.align ?? 'left',
                        }}
                      >
                        {col.render
                          ? col.render(row, idx)
                          : (row[col.key] as ReactNode ?? null)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {paginationConfig !== false && sortedData.length > 0 && (
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          total={sortedData.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
}
