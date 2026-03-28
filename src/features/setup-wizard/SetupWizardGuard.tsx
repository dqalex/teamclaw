'use client';

import { useSetupWizardGuard } from './useSetupWizardGuard';
import { SetupWizard } from './SetupWizard';

/**
 * 设置向导守卫组件
 * 当检测到无项目且未完成初始化时，全屏显示设置向导
 * 覆盖整个页面内容（包括侧边栏）
 */
export default function SetupWizardGuard() {
  const { showWizard } = useSetupWizardGuard();

  if (showWizard !== true) {
    return null;
  }

  // 全屏覆盖，使用 fixed 定位覆盖整个应用
  return (
    <div className="fixed inset-0 z-50">
      <SetupWizard />
    </div>
  );
}
