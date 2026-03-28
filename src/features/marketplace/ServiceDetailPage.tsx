'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Zap, Coins, CreditCard, Gift, Key, CalendarDays, MessageSquare, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Badge, Button, Input, Textarea, Spinner } from '@/shared/ui';
import { useMarketplaceStore } from '@/domains/marketplace/store';
import { useConsumerAuthStore } from '@/domains/consumer/store';
import RatingStars from './components/RatingStars';
import clsx from 'clsx';

interface ServiceDetailPageProps {
  serviceId: string;
  onBack: () => void;
}

export default function ServiceDetailPage({ serviceId, onBack }: ServiceDetailPageProps) {
  const { t } = useTranslation();
  const { currentService, loading, error, fetchService, submitRating, activateService, subscribeService } = useMarketplaceStore();
  const consumer = useConsumerAuthStore((s) => s.consumer);

  // 订阅方案选项
  const PLAN_OPTIONS = [
    { value: 'trial', label: t('marketplace.detail.subscribe.trial.label'), description: t('marketplace.detail.subscribe.trial.description') },
    { value: 'monthly', label: t('marketplace.detail.subscribe.monthly.label'), description: t('marketplace.detail.subscribe.monthly.description') },
    { value: 'yearly', label: t('marketplace.detail.subscribe.yearly.label'), description: t('marketplace.detail.subscribe.yearly.description') },
    { value: 'lifetime', label: t('marketplace.detail.subscribe.lifetime.label'), description: t('marketplace.detail.subscribe.lifetime.description') },
  ];

  // 定价模型配置
  const PRICING_CONFIG: Record<string, { icon: typeof Zap; label: string; variant: 'success' | 'primary' | 'warning' | 'info' }> = {
    free: { icon: Gift, label: t('marketplace.pricing.free'), variant: 'success' },
    credits: { icon: Coins, label: t('marketplace.pricing.credits'), variant: 'warning' },
    subscription: { icon: CreditCard, label: t('marketplace.pricing.subscription'), variant: 'primary' },
    one_time: { icon: Zap, label: t('marketplace.pricing.oneTime'), variant: 'info' },
  };

  // 评分状态
  const [userRating, setUserRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // 激活码状态
  const [activationKey, setActivationKey] = useState('');
  const [activating, setActivating] = useState(false);

  // 订阅状态
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [subscribing, setSubscribing] = useState(false);

  // 加载服务详情
  useEffect(() => {
    fetchService(serviceId);
  }, [serviceId, fetchService]);

  const handleSubmitRating = async () => {
    if (userRating === 0) return;
    setRatingSubmitting(true);
    try {
      await submitRating(serviceId, userRating, feedback || undefined);
      setUserRating(0);
      setFeedback('');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleActivate = async () => {
    if (!activationKey.trim()) return;
    setActivating(true);
    try {
      await activateService(serviceId, activationKey.trim());
      setActivationKey('');
    } finally {
      setActivating(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      await subscribeService(serviceId, selectedPlan);
    } finally {
      setSubscribing(false);
    }
  };

  // 加载中
  if (loading && !currentService) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // 错误或无数据
  if (error || !currentService) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm" style={{ color: 'var(--danger)' }}>{error || t('marketplace.detail.notFound')}</p>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t('marketplace.detail.backToMarket')}
        </Button>
      </div>
    );
  }

  const service = currentService;
  const pricing = PRICING_CONFIG[service.pricingModel] || PRICING_CONFIG.free;
  const PricingIcon = pricing.icon;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full px-6 py-6 space-y-6">
        {/* 返回按钮 */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('marketplace.detail.backToMarket')}
        </button>

        {/* 服务标题区 */}
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h1 className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>
              {service.name}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <RatingStars rating={Math.round(service.averageRating || 0)} size="md" />
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {service.averageRating?.toFixed(1) || '-'}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  ({service.ratingCount || 0} {t('marketplace.detail.reviewCount', { count: service.ratingCount || 0 })})
                </span>
              </div>
              <Badge variant={pricing.variant} className="flex items-center gap-1">
                <PricingIcon className="w-3 h-3" />
                {pricing.label}
                {service.priceCredits && service.pricingModel === 'credits' && ` ${service.priceCredits} ${t('marketplace.detail.credits')}`}
              </Badge>
            </div>
          </div>
        </div>

        {/* 描述 */}
        {service.description && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {service.description}
          </p>
        )}

        {/* 统计信息 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: t('marketplace.detail.usageRequests'), value: service.totalUsageRequests || 0 },
            { label: t('marketplace.detail.usageTokens'), value: service.totalUsageTokens || 0 },
            { label: t('marketplace.detail.effectiveness'), value: service.effectivenessScore?.toFixed(1) || '-' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-3 text-center">
                <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</div>
                <div className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 激活码激活 */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4" style={{ color: 'var(--brand)' }} />
              <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {t('marketplace.detail.activation.title')}
              </h3>
            </div>
            {consumer ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder={t('marketplace.detail.activation.placeholder')}
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleActivate}
                  disabled={!activationKey.trim() || activating}
                >
                  {activating ? <Spinner size="sm" /> : t('marketplace.detail.activation.activate')}
                </Button>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <LogIn className="w-3 h-3 inline mr-1" />
                {t('marketplace.detail.activation.loginRequired')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 订阅 */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" style={{ color: 'var(--brand)' }} />
              <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {t('marketplace.detail.subscribe.title')}
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PLAN_OPTIONS.map((plan) => (
                <button
                  key={plan.value}
                  onClick={() => setSelectedPlan(plan.value)}
                  className={clsx(
                    'p-3 rounded-lg border text-left transition-all',
                    selectedPlan === plan.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                      : 'border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                  )}
                  style={selectedPlan !== plan.value ? { borderColor: 'var(--border)' } : undefined}
                >
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{plan.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{plan.description}</div>
                </button>
              ))}
            </div>
            {consumer ? (
              <Button
                size="md"
                onClick={handleSubscribe}
                disabled={subscribing}
                className="w-full md:w-auto"
              >
                {subscribing ? <Spinner size="sm" /> : `订阅 (${PLAN_OPTIONS.find(p => p.value === selectedPlan)?.label})`}
              </Button>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <LogIn className="w-3 h-3 inline mr-1" />
                {t('marketplace.detail.subscribe.loginRequired')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 评分 */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" style={{ color: 'var(--brand)' }} />
              <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {t('marketplace.detail.rating.title')}
              </h3>
            </div>
            {consumer ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('marketplace.detail.rating.yourRating')}</span>
                  <RatingStars rating={userRating} readOnly={false} onChange={setUserRating} size="md" />
                </div>
                <Textarea
                  placeholder={t('marketplace.detail.rating.feedbackPlaceholder')}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleSubmitRating}
                  disabled={userRating === 0 || ratingSubmitting}
                >
                  {ratingSubmitting ? <Spinner size="sm" /> : t('marketplace.detail.rating.submit')}
                </Button>
              </>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <LogIn className="w-3 h-3 inline mr-1" />
                {t('marketplace.detail.rating.loginRequired')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
