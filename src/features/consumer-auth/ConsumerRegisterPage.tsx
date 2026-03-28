'use client';

import { useState } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Input, Button, Spinner } from '@/shared/ui';
import { useConsumerAuthStore } from '@/domains/consumer/store';

interface ConsumerRegisterPageProps {
  onSwitchToLogin?: () => void;
}

export default function ConsumerRegisterPage({ onSwitchToLogin }: ConsumerRegisterPageProps) {
  const { t } = useTranslation();
  const { register, loading, error } = useConsumerAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !displayName.trim()) return;
    await register(email.trim(), password, displayName.trim());
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-5">
          {/* 标题 */}
          <div className="text-center">
            <h1 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('consumer.register.title')}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {t('consumer.register.subtitle')}
            </p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              placeholder={t('consumer.register.displayName')}
              icon={<User className="w-4 h-4" />}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <Input
              type="email"
              placeholder={t('consumer.register.email')}
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder={t('consumer.register.password')}
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            {/* 错误提示 */}
            {error && (
              <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>
            )}

            <Button type="submit" size="md" className="w-full" disabled={loading || !displayName.trim() || !email.trim() || !password}>
              {loading ? <Spinner size="sm" /> : t('consumer.register.submit')}
            </Button>
          </form>

          {/* 切换到登录 */}
          {onSwitchToLogin && (
            <p className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {t('consumer.register.hasAccount')}{' '}
              <button
                onClick={onSwitchToLogin}
                className="font-medium hover:underline"
                style={{ color: 'var(--brand)' }}
              >
                {t('consumer.register.login')}
              </button>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
