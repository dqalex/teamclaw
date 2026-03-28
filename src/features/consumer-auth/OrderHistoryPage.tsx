'use client';

import { useState, useEffect, useCallback } from 'react';
import { Receipt, Zap, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Button } from '@/shared/ui';
import { useConsumerAuthStore } from '@/domains/consumer/store';

type OrderItem = {
  id: string;
  serviceId: string;
  serviceName: string;
  status: string;
  amount: number;
  paymentMethod: string | null;
  createdAt: string;
};

type UsageItem = {
  id: string;
  serviceId: string;
  serviceName: string;
  tokenCount: number;
  requestCount: number;
  createdAt: string;
};

type Tab = 'orders' | 'usage';

export default function OrderHistoryPage() {
  const { t } = useTranslation();
  const { consumer, token } = useConsumerAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [usage, setUsage] = useState<UsageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const STATUS_LABELS: Record<string, string> = {
    pending: t('consumer.orders.status.pending'),
    paid: t('consumer.orders.status.paid'),
    refunded: t('consumer.orders.status.refunded'),
    cancelled: t('consumer.orders.status.cancelled'),
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: 'text-amber-600',
    paid: 'text-green-600',
    refunded: 'text-blue-600',
    cancelled: 'text-slate-400',
  };

  const fetchData = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      const [ordersRes, usageRes] = await Promise.allSettled([
        fetch(`/api/orders?tab=orders`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`/api/orders?tab=usage`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);

      if (ordersRes.status === 'fulfilled' && ordersRes.value.data) {
        setOrders(ordersRes.value.data);
      }
      if (usageRes.status === 'fulfilled' && usageRes.value.data) {
        setUsage(usageRes.value.data);
      }
    } catch {
      setError(t('consumer.orders.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!consumer) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('consumer.recharge.loginRequired')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('consumer.orders.title')}</h2>

      {/* Tab 切换 */}
      <div className="flex border-b border-slate-200 dark:border-slate-700/50">
        <button
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('orders')}
        >
          <Receipt className="w-4 h-4 inline mr-1.5" />
          {t('consumer.orders.tabs.orders')} ({orders.length})
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'usage'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('usage')}
        >
          <Zap className="w-4 h-4 inline mr-1.5" />
          {t('consumer.orders.tabs.usage')} ({usage.length})
        </button>
      </div>

      {/* 加载/错误状态 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <div className="text-sm">{error}</div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={fetchData}>{t('consumer.orders.retry')}</Button>
        </div>
      )}

      {/* 订单列表 */}
      {activeTab === 'orders' && !loading && (
        orders.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('consumer.orders.noOrders')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map(order => (
              <Card key={order.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{order.serviceName}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      ¥{(order.amount / 100).toFixed(2)}
                    </div>
                    <div className={`text-xs ${STATUS_COLORS[order.status] ?? 'text-slate-400'}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* 使用记录 */}
      {activeTab === 'usage' && !loading && (
        usage.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Zap className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('consumer.orders.noUsage')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {usage.map(item => (
              <Card key={item.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{item.serviceName}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium" style={{ color: 'var(--warning)' }}>
                      -{item.tokenCount} {t('consumer.orders.creditsUsed', { count: item.tokenCount })}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {t('consumer.orders.requestCount', { count: item.requestCount })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
