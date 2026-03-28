'use client';

import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { initI18n } from '@/lib/i18n';
import { usePluginStore } from '@/features/settings/plugin-store';
import { Button } from '@/shared/ui';
import { RefreshCw, Power, PowerOff, Trash2, Puzzle, Search, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import type { PluginListItem } from '@/core/plugins';

/** 状态标签颜色映射 */
const STATUS_STYLES: Record<string, string> = {
  enabled: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  disabled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  discovered: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function PluginsSettingsPage() {
  const { t } = useTranslation();
  const plugins = usePluginStore((s) => s.plugins);
  const loading = usePluginStore((s) => s.loading);
  const error = usePluginStore((s) => s.error);
  const activeTab = usePluginStore((s) => s.activeTab);
  const fetchPlugins = usePluginStore((s) => s.fetchPlugins);
  const enablePlugin = usePluginStore((s) => s.enablePlugin);
  const disablePlugin = usePluginStore((s) => s.disablePlugin);
  const uninstallPlugin = usePluginStore((s) => s.uninstallPlugin);
  const setActiveTab = usePluginStore((s) => s.setActiveTab);

  const [searchQuery, setSearchQuery] = React.useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { initI18n(); }, []);
  useEffect(() => { fetchPlugins(); }, [fetchPlugins]);

  // 搜索防抖 500ms
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 500);
  }, []);

  // 按标签页和搜索过滤
  const filteredPlugins = useMemo(() => {
    let result = plugins;
    if (activeTab === 'official') result = result.filter((p) => p.source === 'official');
    if (activeTab === 'community') result = result.filter((p) => p.source === 'community');
    if (activeTab === 'installed') result = result.filter((p) => p.status === 'enabled' || p.status === 'disabled');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [plugins, activeTab, searchQuery]);

  // 统计
  const counts = useMemo(() => ({
    official: plugins.filter((p) => p.source === 'official').length,
    community: plugins.filter((p) => p.source === 'community').length,
    installed: plugins.filter((p) => p.status === 'enabled' || p.status === 'disabled').length,
  }), [plugins]);

  const tabs: { key: 'official' | 'community' | 'installed'; label: string; count: number }[] = [
    { key: 'official', label: t('plugins.tabs.official', { defaultValue: 'Official' }), count: counts.official },
    { key: 'community', label: t('plugins.tabs.community', { defaultValue: 'Community' }), count: counts.community },
    { key: 'installed', label: t('plugins.tabs.installed', { defaultValue: 'Installed' }), count: counts.installed },
  ];

  return (
    <div className="p-6 overflow-auto max-w-5xl mx-auto space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Puzzle className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            {t('plugins.title', { defaultValue: 'Plugin Center' })}
          </h2>
        </div>
        <Button size="sm" variant="secondary" onClick={() => fetchPlugins()} disabled={loading}>
          <RefreshCw className={clsx('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
          {t('common.refresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>

      {/* 搜索栏 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        <input
          type="text"
          placeholder={t('plugins.search', { defaultValue: 'Search plugins...' })}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-1"
          style={{
            background: 'var(--surface-hover)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* 标签页 */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-hover)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeTab === tab.key
                ? 'text-white shadow-sm'
                : 'hover:opacity-80'
            )}
            style={
              activeTab === tab.key
                ? { background: 'var(--primary)', color: '#fff' }
                : { color: 'var(--text-secondary)' }
            }
          >
            {tab.label}
            <span className="ml-1.5 opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* 插件列表 */}
      {loading && plugins.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {t('common.loading', { defaultValue: 'Loading...' })}
          </p>
        </div>
      ) : filteredPlugins.length === 0 ? (
        <div className="text-center py-12">
          <Puzzle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {t('plugins.noPlugins', { defaultValue: 'No plugins found' })}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredPlugins.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              onEnable={() => enablePlugin(plugin.id)}
              onDisable={() => disablePlugin(plugin.id)}
              onUninstall={() => uninstallPlugin(plugin.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- 子组件 ----

import React from 'react';

interface PluginCardProps {
  plugin: PluginListItem;
  onEnable: () => void;
  onDisable: () => void;
  onUninstall: () => void;
}

function PluginCard({ plugin, onEnable, onDisable, onUninstall }: PluginCardProps) {
  const { t } = useTranslation();
  const isEnabled = plugin.status === 'enabled';

  return (
    <div
      className="card p-4 space-y-3 transition-shadow hover:shadow-md"
    >
      {/* 头部：名称 + 状态 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {plugin.icon && <span className="text-lg flex-shrink-0">{plugin.icon}</span>}
          <div className="min-w-0">
            <h3 className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {plugin.name}
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              v{plugin.version}
            </p>
          </div>
        </div>
        <span
          className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0', STATUS_STYLES[plugin.status] ?? '')}
        >
          {plugin.status}
        </span>
      </div>

      {/* 描述 */}
      {plugin.description && (
        <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {plugin.description}
        </p>
      )}

      {/* 能力标签 */}
      {plugin.capabilities && (
        <div className="flex flex-wrap gap-1">
          {plugin.capabilities.channels?.map((ch) => (
            <span key={ch} className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--surface-hover)', color: 'var(--text-tertiary)' }}>
              {ch}
            </span>
          ))}
          {plugin.capabilities.tools?.slice(0, 2).map((tool) => (
            <span key={tool} className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--surface-hover)', color: 'var(--text-tertiary)' }}>
              {tool.split('.').pop()}
            </span>
          ))}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-1.5 pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        {isEnabled ? (
          <Button size="sm" variant="secondary" onClick={onDisable} className="flex-1 text-xs">
            <PowerOff className="w-3 h-3 mr-1" />
            {t('plugins.disable', { defaultValue: 'Disable' })}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={onEnable} className="flex-1 text-xs">
            <Power className="w-3 h-3 mr-1" />
            {t('plugins.enable', { defaultValue: 'Enable' })}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onUninstall} className="text-xs text-red-500 hover:text-red-600">
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
