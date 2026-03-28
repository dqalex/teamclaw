'use client';

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/domains/project/store';

// ============================================================
// 首次使用设置向导守卫
// 检查是否需要显示设置向导（无项目且未完成初始化）
// ============================================================
export function useSetupWizardGuard() {
  const [showWizard, setShowWizard] = useState<boolean | null>(null);

  useEffect(() => {
    // 已完成设置则不显示
    if (localStorage.getItem('setup_completed') === 'true') {
      setShowWizard(false);
      return;
    }

    // 检查是否有已存在的项目
    const projects = useProjectStore.getState().projects;
    const initialized = useProjectStore.getState().initialized;

    if (initialized) {
      // store 已初始化，根据项目数量判断
      setShowWizard(projects.length === 0);
    } else {
      // store 尚未初始化，等初始化后再检查
      // 先假设不显示，后续 store 初始化后会在 DataProvider 中触发
      setShowWizard(false);
    }
  }, []);

  return { showWizard };
}
