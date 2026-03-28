'use client';

import { useEffect, useState } from 'react';
import { useConsumerAuthStore } from '@/domains/consumer/store';

// Consumer Auth 路由入口：根据登录状态自动切换 Login / Register / Profile
export default function ConsumerAuthPage() {
  const { consumer, initialized, fetchMe } = useConsumerAuthStore();
  const [ProfilePage, setProfilePage] = useState<React.ComponentType | null>(null);
  const [LoginPage, setLoginPage] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (!initialized) fetchMe();
  }, [initialized, fetchMe]);

  useEffect(() => {
    import('@/features/consumer-auth').then(mod => {
      setProfilePage(() => mod.ConsumerProfilePage);
      setLoginPage(() => mod.ConsumerLoginPage);
    });
  }, []);

  // 加载中或未初始化
  if (!initialized || (!consumer && !LoginPage)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 已登录：显示 Profile
  if (consumer) {
    return ProfilePage ? <ProfilePage /> : null;
  }

  // 未登录：显示 Login
  return LoginPage ? <LoginPage /> : null;
}
