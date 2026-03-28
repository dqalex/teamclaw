'use client';

import { useTranslation } from 'react-i18next';
import AppShell from '@/shared/layout/AppShell';

import { GatewayStatusWidget } from '@/features/dashboard/widgets/GatewayStatusWidget';
import { StatsOverviewWidget } from '@/features/dashboard/widgets/StatsOverviewWidget';
import { QuickActionsWidget } from '@/features/dashboard/widgets/QuickActionsWidget';
import { AITeamWidget } from '@/features/dashboard/widgets/AITeamWidget';
import { ProjectProgressWidget } from '@/features/dashboard/widgets/ProjectProgressWidget';
import { RecentDeliveriesWidget } from '@/features/dashboard/widgets/RecentDeliveriesWidget';
import { DashboardGrid } from '@/features/dashboard/DashboardGrid';

/**
 * Dashboard 2.0 — 指挥中心
 * 
 * 设计目标：从信息聚合 → 指挥中心，提供清晰的系统状态概览
 * 架构：Widget 系统 — 每个 Widget 独立渲染、独立数据订阅
 * 
 * Widget 布局：
 * Row 1: GatewayStatusWidget (4 cols)
 * Row 2: StatsOverviewWidget (4 cols, 内含 4 个渐变统计卡)
 * Row 3: QuickActionsWidget (4 cols)
 * Row 4: AITeamWidget (2 cols) | ProjectProgressWidget (2 cols)
 * Row 5: RecentDeliveriesWidget (2 cols) | [预留] (2 cols)
 * 
 * @see docs/optimization/teamclaw_v1.1_ui_design_spec.md §12.1
 */
export default function DashboardPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-5">
        {/* Row 1: Gateway 连接状态 — 全宽醒目展示 */}
        <DashboardGrid>
          <GatewayStatusWidget />
        </DashboardGrid>

        {/* Row 2: 今日概览 — 4 个渐变统计卡片 */}
        <DashboardGrid>
          <StatsOverviewWidget />
        </DashboardGrid>

        {/* Row 3: 快捷入口 — 7 个导航卡片 */}
        <DashboardGrid>
          <QuickActionsWidget />
        </DashboardGrid>

        {/* Row 4: AI 团队状态 + 项目进度 — 双列布局 */}
        <DashboardGrid>
          <AITeamWidget />
          <ProjectProgressWidget />
        </DashboardGrid>

        {/* Row 5: 最近交付 — 双列布局（右侧预留扩展） */}
        <DashboardGrid>
          <RecentDeliveriesWidget />
        </DashboardGrid>
      </div>
    </AppShell>
  );
}
