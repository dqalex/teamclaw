'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { initI18n } from '@/lib/i18n';
import { useOpenClawWorkspaceStore } from '@/core/gateway/openclaw-workspace.store';
import { WorkspaceCard } from '@/features/skill-manager/WorkspaceCard';
import { WorkspaceForm } from '@/features/skill-manager/WorkspaceForm';
import { GatewayConfigPanel } from '@/features/settings/GatewayConfigPanel';
import { Button } from '@/shared/ui';
import { Plus, RefreshCw, FolderSync } from 'lucide-react';
import clsx from 'clsx';

export default function OpenClawSettingsPage() {
  const { t } = useTranslation();
  // 精确 selector 订阅
  const workspaces = useOpenClawWorkspaceStore((s) => s.workspaces);
  const loading = useOpenClawWorkspaceStore((s) => s.loading);
  const error = useOpenClawWorkspaceStore((s) => s.error);
  const fetchWorkspaces = useOpenClawWorkspaceStore((s) => s.fetchWorkspaces);
  const createWorkspace = useOpenClawWorkspaceStore((s) => s.createWorkspace);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    initI18n();
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return (
    <div className="p-6 overflow-auto max-w-5xl mx-auto space-y-6">
      {/* Gateway 连接模式配置 */}
      <GatewayConfigPanel />

      {/* 连接说明 */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
          {t('settings.openclaw.connectionGuide.title', { defaultValue: 'Connection Guide' })}
        </h3>
        <ul className="text-xs space-y-1.5 list-disc list-inside" style={{ color: 'var(--text-tertiary)' }}>
          <li>{t('settings.openclaw.connectionGuide.tip1', { defaultValue: 'Ensure OpenClaw Gateway is running (default ws://localhost:18789)' })}</li>
          <li>{t('settings.openclaw.connectionGuide.tip2', { defaultValue: 'Server proxy mode: connection maintained by server, browser close does not affect tasks' })}</li>
          <li>{t('settings.openclaw.connectionGuide.tip3', { defaultValue: 'Browser direct mode: connection established by browser, suitable for real-time chat' })}</li>
          <li>{t('settings.openclaw.connectionGuide.tip4', { defaultValue: 'Token is required for authentication' })}</li>
        </ul>
      </div>

      {/* SSH 隧道说明 */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          {t('settings.openclaw.remoteGuide.title', { defaultValue: 'Remote Connection Guide' })}
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
          {t('settings.openclaw.remoteGuide.desc', { defaultValue: 'If Gateway is running on a remote server, use SSH tunnel for secure connection:' })}
        </p>
        <div className="p-3 rounded-lg text-xs font-mono mb-3" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
          <code>ssh -L 18789:localhost:18789 user@remote-server</code>
        </div>
      </div>

      {/* Workspace 设置 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <FolderSync className="w-4 h-4" />
            {t('openclaw.workspace.title', { defaultValue: 'OpenClaw Workspace' })}
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => fetchWorkspaces()} disabled={loading}>
              <RefreshCw className={clsx('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
              {t('openclaw.refresh', { defaultValue: 'Refresh' })}
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {t('openclaw.add', { defaultValue: 'Add Workspace' })}
            </Button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading && workspaces.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('common.loading', { defaultValue: 'Loading...' })}</p>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {t('openclaw.noWorkspace', { defaultValue: 'No workspaces configured' })}
          </div>
        ) : (
          <div className="space-y-3">
            {workspaces.map((workspace) => (
              <WorkspaceCard key={workspace.id} workspace={workspace} />
            ))}
          </div>
        )}

        {/* 创建表单弹窗 */}
        {showForm && (
          <WorkspaceForm
            onClose={() => setShowForm(false)}
            onSubmit={async (data) => {
              await createWorkspace({
                ...data,
                memberId: data.memberId ?? undefined,
              });
              setShowForm(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
