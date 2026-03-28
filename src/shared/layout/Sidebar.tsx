'use client';

import { useState, useMemo, memo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useProjectStore, useUIStore, useTaskStore, useDocumentStore, useMemberStore } from '@/domains';
import { useOpenClawStatusStore } from '@/core/gateway/store';
import { CreateProjectDialog } from '@/features/task-board/CreateProjectDialog';
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Folder,
  Plus,
  Trash2,
  Edit2,
  MoreVertical,
  CheckSquare,
  File,
  Bot,
  Lock,
  Globe,
  Building2,
} from 'lucide-react';
import {
  sidebarNavItems,
  inferNavFromPath,
  inferFirstRoute,
} from './nav-config';
import { TeamClawLogo } from './Logo';
import type { NavSection } from '@/domains/ui/store';
import clsx from 'clsx';
import { Card, Button } from '@/shared/ui';

// ----------------------------------------------------------------
// 导航项组件（收缩态 = 大图标按钮，展开态 = 图标 + 文字）
// ----------------------------------------------------------------
interface SidebarNavItemProps {
  item: typeof sidebarNavItems[number];
  isOpen: boolean;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

const SidebarNavItemButton = memo(function SidebarNavItemButton({
  item, isOpen, isActive, onClick, badge,
}: SidebarNavItemProps) {
  const { t } = useTranslation();
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'group relative flex items-center w-full rounded-xl transition-all duration-200',
        isOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-3',
        isActive
          ? 'bg-[var(--brand)]/[0.08] text-[var(--brand)]'
          : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
      )}
      title={isOpen ? undefined : t(item.labelKey, item.defaultLabel)}
    >
      {/* 收缩时的选中指示条 */}
      {isActive && !isOpen && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--brand)]" />
      )}
      <div className={clsx(
        'flex items-center justify-center rounded-xl transition-all duration-200 flex-shrink-0',
        isOpen ? 'w-8 h-8' : 'w-10 h-10',
        isActive
          ? 'bg-[var(--brand)] shadow-[0_0_12px_rgba(99,102,241,0.25)]'
          : ''
      )}>
        <Icon className={clsx(
          'transition-colors duration-200',
          isOpen ? 'w-[18px] h-[18px]' : 'w-[22px] h-[22px]',
          isActive ? 'text-white' : ''
        )} />
      </div>
      {isOpen && (
        <span className={clsx(
          'text-[13px] transition-colors duration-200 truncate',
          isActive ? 'font-semibold text-[var(--brand)]' : 'font-medium group-hover:text-[var(--text-primary)]'
        )}>
          {t(item.labelKey, item.defaultLabel)}
        </span>
      )}
      {/* badge */}
      {badge != null && badge > 0 && (
        <span className={clsx(
          'min-w-[16px] h-4 px-1 bg-[var(--ai)] text-white text-[10px] font-bold rounded-full flex items-center justify-center',
          isOpen ? 'ml-auto' : 'absolute top-1.5 right-1.5'
        )}>
          {badge}
        </span>
      )}
    </button>
  );
});

// ----------------------------------------------------------------
// 展开态的项目列表（原版：带展开折叠子项目）
// ----------------------------------------------------------------
interface ProjectListProps {
  projects: ReturnType<typeof useProjectStore.getState>['projects'];
  currentProjectId: string | null;
  expandedProjects: string[];
  projectCounts: Record<string, { tasks: number; docs: number }>;
  setCurrentProject: (id: string | null) => void;
  toggleProjectExpand: (id: string) => void;
  expandProject: (id: string) => void;
  deleteProjectAsync: (id: string) => Promise<boolean>;
  setShowCreateDialog: (show: boolean) => void;
  pathname: string;
  router: ReturnType<typeof useRouter>;
}

const ProjectList = memo(function ProjectList({
  projects, currentProjectId, expandedProjects, projectCounts,
  setCurrentProject, toggleProjectExpand, expandProject, deleteProjectAsync,
  setShowCreateDialog, pathname, router,
}: ProjectListProps) {
  const { t } = useTranslation();
  const [showProjectMenu, setShowProjectMenu] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleProjectClick = (projectId: string) => {
    setCurrentProject(projectId);
    expandProject(projectId);
    router.push('/tasks');
  };

  const isProjectSubItemActive = (projectId: string, type: 'tasks' | 'wiki') => {
    if (currentProjectId !== projectId) return false;
    if (type === 'tasks') return pathname === '/tasks' || pathname.startsWith('/tasks/');
    return pathname === '/wiki';
  };

  return (
    <nav className="mt-1">
      <div className="flex items-center justify-between px-3 mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          {t('nav.projects')}
        </span>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="p-1 rounded-lg transition-colors text-[var(--text-tertiary)] hover:text-[var(--brand)] hover:bg-[var(--surface-hover)]"
          title={t('projects.newProject')}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <ul className="space-y-0.5">
        {projects.map((project) => {
          const isExpanded = expandedProjects.includes(project.id);
          const isActive = currentProjectId === project.id;
          const taskCount = projectCounts[project.id]?.tasks ?? 0;
          const docCount = projectCounts[project.id]?.docs ?? 0;

          const VisibilityIcon = project.visibility === 'private' ? Lock :
                                 project.visibility === 'public' ? Globe : Building2;
          const visibilityColor = project.visibility === 'private' ? 'text-amber-500' :
                                  project.visibility === 'public' ? 'text-green-500' : 'text-blue-500';

          return (
            <li key={project.id}>
              <div className="relative">
                <div
                  className={clsx(
                    'w-full flex items-center gap-1.5 px-2.5 py-[7px] rounded-xl transition-all duration-200 text-[13px] group cursor-pointer',
                    isActive
                      ? 'bg-[var(--brand)]/[0.08]'
                      : 'hover:bg-[var(--surface-hover)]'
                  )}
                  style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  <button
                    onClick={() => toggleProjectExpand(project.id)}
                    className="p-0.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    <ChevronDown className={clsx(
                      'w-3 h-3 transition-transform duration-200',
                      !isExpanded && '-rotate-90'
                    )} style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                  <div
                    className="flex-1 flex items-center gap-1.5 min-w-0"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <Folder className={clsx(
                      'w-3.5 h-3.5 flex-shrink-0 transition-colors',
                      isActive ? 'text-[var(--brand)]' : ''
                    )} style={{ color: isActive ? undefined : 'var(--text-tertiary)' }} />
                    <span className={clsx('flex-1 text-left truncate', isActive && 'font-semibold')}>
                      {project.name}
                    </span>
                    <VisibilityIcon className={clsx('w-3 h-3 flex-shrink-0', visibilityColor)} />
                  </div>
                  <button
                    onClick={() => setShowProjectMenu(showProjectMenu === project.id ? null : project.id)}
                    className="p-0.5 opacity-0 group-hover:opacity-100 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-all duration-200"
                  >
                    <MoreVertical className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                </div>

                {/* 项目操作菜单 */}
                {showProjectMenu === project.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProjectMenu(null)} />
                    <div className="absolute right-2 top-full mt-1 w-32 rounded-xl shadow-float border z-50 py-1 animate-fadeIn" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <button
                        onClick={() => {
                          setShowProjectMenu(null);
                          router.push(`/projects?edit=${project.id}`);
                        }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 rounded-lg mx-0 transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Edit2 className="w-3 h-3" /> {t('common.edit')}
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(project.id); setShowProjectMenu(null); }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 flex items-center gap-2 rounded-lg mx-0 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> {t('common.delete')}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 展开态：子项目导航 */}
              {isExpanded && (
                <ul className="ml-6 mt-0.5 space-y-0.5">
                  <li>
                    <Link
                      href="/tasks"
                      onClick={() => setCurrentProject(project.id)}
                      className={clsx(
                        'flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all duration-200 text-[13px]',
                        isProjectSubItemActive(project.id, 'tasks')
                          ? 'font-semibold bg-[var(--brand)]/[0.06]'
                          : 'hover:bg-[var(--surface-hover)]'
                      )}
                      style={{ color: isProjectSubItemActive(project.id, 'tasks') ? 'var(--brand)' : 'var(--text-tertiary)' }}
                    >
                      <CheckSquare className="w-3 h-3" />
                      <span>{t('nav.tasks')}</span>
                      <span className="text-[11px] ml-auto font-medium tabular-nums" style={{ color: 'var(--text-tertiary)' }}>{taskCount}</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/wiki"
                      onClick={() => setCurrentProject(project.id)}
                      className={clsx(
                        'flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all duration-200 text-[13px]',
                        isProjectSubItemActive(project.id, 'wiki')
                          ? 'font-semibold bg-[var(--brand)]/[0.06]'
                          : 'hover:bg-[var(--surface-hover)]'
                      )}
                      style={{ color: isProjectSubItemActive(project.id, 'wiki') ? 'var(--brand)' : 'var(--text-tertiary)' }}
                    >
                      <File className="w-3 h-3" />
                      <span>{t('nav.wiki')}</span>
                      <span className="text-[11px] ml-auto font-medium tabular-nums" style={{ color: 'var(--text-tertiary)' }}>{docCount}</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          );
        })}

        {/* 空状态 */}
        {projects.length === 0 && (
          <li className="px-3 py-8 text-center">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
              <Folder className="w-5 h-5 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>{t('projects.noProjects')}</p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--brand)] text-white hover:opacity-90 transition-opacity"
            >
              {t('projects.newProject')}
            </button>
          </li>
        )}
      </ul>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <Card className="p-6 w-80 shadow-xl animate-fadeIn">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-display font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>{t('common.confirm')}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t('common.delete')} - {t('nav.projects')}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)}>{t('common.cancel')}</Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await deleteProjectAsync(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                }}
              >
                {t('common.delete')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </nav>
  );
});

// ----------------------------------------------------------------
// 主 Sidebar 组件
// ----------------------------------------------------------------
export default function Sidebar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  // UI Store
  const isOpen = useUIStore((s) => s.sidebarOpen);
  const hydrated = useUIStore((s) => s.hydrated);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const activeNavSection = useUIStore((s) => s.activeNavSection);
  const setActiveNavSection = useUIStore((s) => s.setActiveNavSection);
  const expandedProjects = useUIStore((s) => s.expandedProjects);
  const toggleProjectExpand = useUIStore((s) => s.toggleProjectExpand);
  const expandProject = useUIStore((s) => s.expandProject);

  // Project Store
  const projects = useProjectStore((s) => s.projects);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const deleteProjectAsync = useProjectStore((s) => s.deleteProjectAsync);

  // Task / Document Store（用于项目计数）
  const tasks = useTaskStore((s) => s.tasks);
  const documents = useDocumentStore((s) => s.documents);

  // AI 成员状态
  const getAIMembers = useMemberStore((s) => s.getAIMembers);
  const members = useMemberStore((s) => s.members);
  const statusList = useOpenClawStatusStore((s) => s.statusList);
  const getByMemberId = useOpenClawStatusStore((s) => s.getByMemberId);

  const aiMembers = useMemo(() => getAIMembers(), [members]);
  const aiStatus = useMemo(() => {
    const working = aiMembers.filter(m => {
      const s = getByMemberId(m.id);
      return s?.status === 'working';
    });
    return { working: working.length, total: aiMembers.length };
  }, [aiMembers, statusList, getByMemberId]);

  // 项目计数（任务数 + 文档数）
  const projectCounts = useMemo(() => {
    const taskCounts = new Map<string, number>();
    for (const task of tasks) {
      if (task.projectId) taskCounts.set(task.projectId, (taskCounts.get(task.projectId) || 0) + 1);
      if (Array.isArray(task.crossProjects)) for (const pid of task.crossProjects) taskCounts.set(pid, (taskCounts.get(pid) || 0) + 1);
    }
    const docCounts = new Map<string, number>();
    for (const d of documents) {
      if (d.projectId) docCounts.set(d.projectId, (docCounts.get(d.projectId) || 0) + 1);
      if (Array.isArray(d.projectTags)) {
        for (const tag of d.projectTags) {
          docCounts.set(tag, (docCounts.get(tag) || 0) + 1);
        }
      }
    }
    const counts: Record<string, { tasks: number; docs: number }> = {};
    for (const p of projects) {
      const docsByName = docCounts.get(p.name) || 0;
      const docsById = docCounts.get(p.id) || 0;
      counts[p.id] = {
        tasks: taskCounts.get(p.id) || 0,
        docs: Math.max(docsById, docsByName),
      };
    }
    return counts;
  }, [projects, tasks, documents]);

  // 根据 pathname 自动推断 section
  useEffect(() => {
    const { section } = inferNavFromPath(pathname);
    if (section !== activeNavSection) {
      setActiveNavSection(section);
    }
  }, [pathname, activeNavSection, setActiveNavSection]);

  const handleNavClick = useCallback((section: NavSection) => {
    setActiveNavSection(section);
    const route = inferFirstRoute(section);
    if (route) {
      router.push(route);
    }
  }, [setActiveNavSection, router]);

  const isActuallyOpen = hydrated ? isOpen : true;
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <>
      <aside
        className={clsx(
          'fixed left-0 top-0 bottom-0 bg-[var(--surface)] border-r flex flex-col z-40 transition-all duration-300',
          isActuallyOpen ? 'w-[248px]' : 'w-[64px]',
        )}
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Logo + 收缩/展开按钮 */}
        <div className={clsx(
          'h-14 flex items-center border-b px-4 flex-shrink-0',
          isActuallyOpen ? 'justify-between' : 'justify-center',
        )} style={{ borderColor: 'var(--border)' }}>
          {isActuallyOpen ? (
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center">
                <TeamClawLogo className="w-8 h-8" />
              </div>
              <span className="font-display font-bold text-[15px] tracking-tight" style={{ color: 'var(--text-primary)' }}>
                TeamClaw
              </span>
            </Link>
          ) : (
            <Link href="/" className="flex items-center justify-center">
              <TeamClawLogo className="w-8 h-8" />
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className={clsx(
              'p-2 rounded-xl transition-all duration-200 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
              !isActuallyOpen && 'mt-2'
            )}
            title={isActuallyOpen ? t('nav.collapseSidebar', '收缩侧边栏') : t('nav.expandSidebar', '展开侧边栏')}
          >
            {isActuallyOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* 主导航（图标栏） */}
        <nav className={clsx(
          'flex-shrink-0 border-b',
          isActuallyOpen ? 'px-3 py-3 space-y-0.5' : 'py-3 space-y-1',
        )} style={{ borderColor: 'var(--border)' }}>
          {sidebarNavItems.map((item) => (
            <SidebarNavItemButton
              key={item.section}
              item={item}
              isOpen={isActuallyOpen}
              isActive={activeNavSection === item.section}
              onClick={() => handleNavClick(item.section)}
              badge={item.badge}
            />
          ))}
        </nav>

        {/* 展开态：项目列表 */}
        {isActuallyOpen && (
          <div className="flex-1 overflow-y-auto py-2">
            <ProjectList
              projects={projects}
              currentProjectId={currentProjectId}
              expandedProjects={expandedProjects}
              projectCounts={projectCounts}
              setCurrentProject={setCurrentProject}
              toggleProjectExpand={toggleProjectExpand}
              expandProject={expandProject}
              deleteProjectAsync={deleteProjectAsync}
              setShowCreateDialog={setShowCreateDialog}
              pathname={pathname}
              router={router}
            />
          </div>
        )}

        {/* 收缩态：底部 Gateway 状态 */}
        {!isActuallyOpen && (
          <div className="py-4 space-y-2 border-t border-[var(--border)] flex-1 flex flex-col justify-end">
            <div
              className="w-full flex items-center justify-center p-3"
              title={`OpenClaw: ${aiStatus.working > 0 ? 'Running' : 'Idle'} (${aiStatus.working}/${aiStatus.total})`}
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--ai-light)] flex items-center justify-center">
                <Bot className={clsx(
                  'w-5 h-5 transition-colors',
                  aiStatus.working > 0 ? 'text-[var(--ai)]' : 'text-[var(--text-tertiary)]'
                )} />
              </div>
            </div>
          </div>
        )}

        {/* 展开态：底部状态栏 */}
        {isActuallyOpen && (
          <div className="px-5 py-3 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={clsx(
                  'w-2 h-2 rounded-full transition-colors',
                  aiStatus.working > 0 ? 'bg-[var(--ai)] animate-pulse' : 'bg-[var(--text-tertiary)]'
                )} />
                <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  {aiStatus.working > 0 ? `${aiStatus.working} Agent ${t('common.running')}` : 'OpenClaw Idle'}
                </span>
              </div>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                v{process.env.NEXT_PUBLIC_APP_VERSION}
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* 创建项目对话框 */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
}
