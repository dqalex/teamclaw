'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Check, CheckCheck, X, Trash2, Clock, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { useClickOutside } from '@/shared/hooks/useClickOutside';

export interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  description?: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationCenterProps {
  className?: string;
}

const MAX_NOTIFICATIONS = 50;

/**
 * NotificationCenter — 通知中心面板
 *
 * 从 localStorage 读取/持久化通知数据。
 * 提供 Bell 按钮点击后展示通知列表。
 */
export function NotificationCenter({ className }: NotificationCenterProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>(loadNotifications);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  useClickOutside(panelRef, useCallback(() => setIsOpen(false), []));

  // 持久化到 localStorage
  const saveNotifications = useCallback((items: NotificationItem[]) => {
    const trimmed = items.slice(0, MAX_NOTIFICATIONS);
    setNotifications(trimmed);
    try {
      localStorage.setItem('teamclaw-notifications', JSON.stringify(trimmed));
    } catch {
      // localStorage 不可用则忽略
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      try {
        localStorage.setItem('teamclaw-notifications', JSON.stringify(updated.slice(0, MAX_NOTIFICATIONS)));
      } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const markAllRead = useCallback(() => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  const deleteNotification = useCallback((id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  const clearAll = useCallback(() => {
    saveNotifications([]);
  }, [saveNotifications]);

  // 添加演示通知（首次打开时）
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    if (notifications.length === 0) {
      const demoNotifications: NotificationItem[] = [
        {
          id: 'demo-1',
          type: 'info',
          title: t('notifications.welcome', 'Welcome to TeamClaw'),
          description: t('notifications.welcomeDesc', 'Notifications will appear here'),
          timestamp: new Date(),
          read: false,
        },
        {
          id: 'demo-2',
          type: 'success',
          title: t('notifications.systemReady', 'System Ready'),
          description: t('notifications.systemReadyDesc', 'All services are running normally'),
          timestamp: new Date(Date.now() - 300000),
          read: false,
        },
      ];
      saveNotifications(demoNotifications);
    }
  }, [notifications.length, saveNotifications, t]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t('notifications.justNow', 'Just now');
    if (diffMin < 60) return t('notifications.minutesAgo', { count: diffMin });
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
    return date.toLocaleDateString();
  };

  const typeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error': return <X className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className={clsx('relative', className)} ref={panelRef}>
      {/* Bell 按钮 */}
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 rounded-xl transition-all duration-200 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
        style={{ color: 'var(--text-secondary)' }}
        aria-label={t('notifications.title')}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 通知面板 */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-[360px] rounded-2xl shadow-xl border z-50 animate-fadeIn overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('notifications.title')}
              </span>
              {unreadCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  title={t('notifications.markAllRead', 'Mark all as read')}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  title={t('notifications.clearAll', 'Clear all')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 通知列表 */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--surface-hover)' }}>
                  <Bell className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {t('notifications.empty', 'No notifications')}
                </p>
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={clsx(
                      'flex items-start gap-3 px-4 py-3 transition-all duration-200 cursor-pointer',
                      !notification.read
                        ? 'hover:bg-primary-50/30 dark:hover:bg-primary-500/[0.03]'
                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {typeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                        )}
                        <p
                          className={clsx(
                            'text-[13px] truncate',
                            !notification.read ? 'font-semibold' : 'font-medium'
                          )}
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {notification.title}
                        </p>
                      </div>
                      {notification.description && (
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
                          {notification.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                        <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 self-start"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function loadNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem('teamclaw-notifications');
    if (!data) return [];
    const parsed = JSON.parse(data) as NotificationItem[];
    return parsed.map(n => ({ ...n, timestamp: new Date(n.timestamp) }));
  } catch {
    return [];
  }
}

export default NotificationCenter;
