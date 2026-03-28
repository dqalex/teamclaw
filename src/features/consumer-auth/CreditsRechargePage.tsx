'use client';

import { useState, useCallback, useRef } from 'react';
import { Coins, CreditCard, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Button, Spinner } from '@/shared/ui';
import { useConsumerAuthStore } from '@/domains/consumer/store';

export default function CreditsRechargePage() {
  const { t } = useTranslation();
  const { consumer, token, fetchMe } = useConsumerAuthStore();
  const [selectedCredits, setSelectedCredits] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; newBalance: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const CREDIT_PACKAGES = [
    { credits: 100, label: '100 Credits', price: '¥1', popular: false },
    { credits: 500, label: '500 Credits', price: '¥5', popular: true },
    { credits: 1000, label: '1,000 Credits', price: '¥10', popular: false },
    { credits: 5000, label: '5,000 Credits', price: '¥50', popular: false },
  ];

  const handlePurchase = useCallback(async () => {
    if (loading || submittedRef.current) return;
    const amount = customAmount ? parseInt(customAmount, 10) : selectedCredits;
    if (!amount || amount <= 0 || !token) return;

    submittedRef.current = true;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ creditsAmount: amount }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('consumer.recharge.purchaseFailed'));
        return;
      }

      setResult({ success: true, newBalance: data.newBalance });
      fetchMe();
    } catch {
      setError(t('consumer.recharge.networkError'));
    } finally {
      setLoading(false);
      setTimeout(() => { submittedRef.current = false; }, 500);
    }
  }, [loading, customAmount, selectedCredits, token, fetchMe, t]);

  if (!consumer) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('consumer.recharge.loginRequired')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 md:p-6 space-y-6">
      {/* 当前余额 */}
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--warning-50, #fef3c7)' }}>
            <Coins className="w-6 h-6" style={{ color: 'var(--warning, #f59e0b)' }} />
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('consumer.recharge.currentBalance')}</div>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {(result ? result.newBalance : consumer.credits).toLocaleString()}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('consumer.recharge.credits')}</div>
          </div>
        </CardContent>
      </Card>

      {/* 充值成功提示 */}
      {result?.success && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">{t('consumer.recharge.successMessage', { balance: result.newBalance.toLocaleString() })}</div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* 套餐选择 */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>{t('consumer.recharge.selectPackage')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {CREDIT_PACKAGES.map(pkg => (
              <button
                key={pkg.credits}
                className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                  selectedCredits === pkg.credits && !customAmount
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
                onClick={() => { setSelectedCredits(pkg.credits); setCustomAmount(''); }}
              >
                {pkg.popular && (
                  <span className="absolute -top-2 right-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary-500 text-white">{t('consumer.recharge.popular')}</span>
                )}
                <Coins className="w-6 h-6 mb-2" style={{ color: 'var(--warning)' }} />
                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{pkg.label}</span>
                <span className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{pkg.price}</span>
              </button>
            ))}
          </div>

          {/* 自定义金额 */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('consumer.recharge.customAmount')}</label>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); if (e.target.value) setSelectedCredits(0); }}
              placeholder={t('consumer.recharge.customPlaceholder')}
              min={1}
              max={100000}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          {/* 充值按钮 */}
          <Button
            size="md"
            className="w-full"
            onClick={handlePurchase}
            disabled={loading || (!customAmount && selectedCredits === 0)}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> {t('consumer.recharge.processing')}</>
            ) : (
              <><CreditCard className="w-4 h-4 mr-1.5" /> {t('consumer.recharge.rechargeButton', { count: Number(customAmount) || selectedCredits })}</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
