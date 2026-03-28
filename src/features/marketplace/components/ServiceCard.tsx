'use client';

import { useTranslation } from 'react-i18next';
import { Card, CardContent, Badge } from '@/shared/ui';
import { Zap, Coins, CreditCard, Gift } from 'lucide-react';
import RatingStars from './RatingStars';
import type { Service } from '@/domains/marketplace/store';

interface ServiceCardProps {
  service: Service;
  onClick?: (service: Service) => void;
}

// 格式化使用次数
function formatUsage(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export default function ServiceCard({ service, onClick }: ServiceCardProps) {
  const { t } = useTranslation();

  // 定价模型对应的图标和标签
  const PRICING_CONFIG: Record<string, { icon: typeof Zap; label: string; variant: 'success' | 'primary' | 'warning' | 'info' }> = {
    free: { icon: Gift, label: t('marketplace.pricing.free'), variant: 'success' },
    credits: { icon: Coins, label: t('marketplace.pricing.credits'), variant: 'warning' },
    subscription: { icon: CreditCard, label: t('marketplace.pricing.subscription'), variant: 'primary' },
    one_time: { icon: Zap, label: t('marketplace.pricing.oneTime'), variant: 'info' },
  };

  const pricing = PRICING_CONFIG[service.pricingModel] || PRICING_CONFIG.free;
  const PricingIcon = pricing.icon;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group"
      onClick={() => onClick?.(service)}
    >
      <CardContent className="p-4 flex flex-col gap-3">
        {/* 名称 + 定价标签 */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-display font-semibold text-sm truncate flex-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {service.name}
          </h3>
          <Badge variant={pricing.variant} className="flex items-center gap-1 flex-shrink-0 text-[10px] px-1.5 py-0.5">
            <PricingIcon className="w-3 h-3" />
            {pricing.label}
          </Badge>
        </div>

        {/* 描述 */}
        {service.description && (
          <p
            className="text-xs line-clamp-2 leading-relaxed"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {service.description}
          </p>
        )}

        {/* 评分 + 使用次数 */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <RatingStars rating={Math.round(service.averageRating || 0)} />
            {service.ratingCount !== undefined && service.ratingCount > 0 && (
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                ({service.ratingCount})
              </span>
            )}
          </div>
          {(service.totalUsageRequests ?? 0) > 0 && (
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {formatUsage(service.totalUsageRequests || 0)} {t('marketplace.pricing.usageCount', { count: service.totalUsageRequests || 0 })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
