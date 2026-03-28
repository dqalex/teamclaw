'use client';

import { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Input, Button, Spinner } from '@/shared/ui';
import { useConsumerAuthStore } from '@/domains/consumer/store';

interface ConsumerLoginPageProps {
  onSwitchToRegister?: () => void;
}

export default function ConsumerLoginPage({ onSwitchToRegister }: ConsumerLoginPageProps) {
  const { t } = useTranslation();
  const { login, loading, error } = useConsumerAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    await login(email.trim(), password);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-5">
          {/* 标题 */}
          <div className="text-center">
            <h1 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
              {t('consumer.login.title')}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {t('consumer.login.subtitle')}
            </p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder={t('consumer.login.email')}
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder={t('consumer.login.password')}
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* 错误提示 */}
            {error && (
              <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>
            )}

            <Button type="submit" size="md" className="w-full" disabled={loading || !email.trim() || !password}>
              {loading ? <Spinner size="sm" /> : t('consumer.login.submit')}
            </Button>
          </form>

          {/* 切换到注册 */}
          {onSwitchToRegister && (
            <p className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {t('consumer.login.noAccount')}{' '}
              <button
                onClick={onSwitchToRegister}
                className="font-medium hover:underline"
                style={{ color: 'var(--brand)' }}
              >
                {t('consumer.login.register')}
              </button>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
