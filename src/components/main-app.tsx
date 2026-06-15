'use client';

import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { AppSidebar } from '@/components/app-sidebar';
import { TopBar } from '@/components/top-bar';
import { NotificationPanel } from '@/components/notification-panel';
import { CreateWorkspaceDialog } from '@/components/create-workspace-dialog';
import { CreateTaskDialog } from '@/components/create-task-dialog';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { EditProjectDialog } from '@/components/edit-project-dialog';
import { EditTaskDialog } from '@/components/edit-task-dialog';
import { CreateSprintDialog } from '@/components/create-sprint-dialog';
import { CreateMilestoneDialog } from '@/components/create-milestone-dialog';
import { TaskDetailDrawer } from '@/components/task-detail-drawer';
import { ShortcutsDialog } from '@/components/shortcuts-dialog';
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Toaster } from '@/components/ui/sonner';

import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { DraggableQuickAction } from '@/components/draggable-quick-action';
import { useState, useEffect, useSyncExternalStore, Suspense } from 'react';
import { AppDataProvider } from '@/hooks/use-app-data';
import { AppDataSync } from '@/components/app-data-sync';
import { PageTransition } from '@/components/page-transition';
import { SearchDialog } from '@/components/search-dialog';

// Dynamic imports to reduce initial compilation load and prevent ChunkLoadError
const DashboardView = dynamic(() => import('@/components/views/dashboard-view').then(m => ({ default: m.DashboardView })), { ssr: false });
const TasksView = dynamic(() => import('@/components/views/tasks-view').then(m => ({ default: m.TasksView })), { ssr: false });
const ProjectsView = dynamic(() => import('@/components/views/projects-view').then(m => ({ default: m.ProjectsView })), { ssr: false });
const ProjectDetailView = dynamic(() => import('@/components/views/project-detail-view').then(m => ({ default: m.ProjectDetailView })), { ssr: false });
const CalendarView = dynamic(() => import('@/components/views/calendar-view').then(m => ({ default: m.CalendarView })), { ssr: false });
const MessagesView = dynamic(() => import('@/components/views/messages-view').then(m => ({ default: m.MessagesView })), { ssr: false });
const MeetingsView = dynamic(() => import('@/components/views/meetings-view').then(m => ({ default: m.MeetingsView })), { ssr: false });
const MembersView = dynamic(() => import('@/components/views/members-view').then(m => ({ default: m.MembersView })), { ssr: false });
const TeamsView = dynamic(() => import('@/components/views/teams-view').then(m => ({ default: m.TeamsView })), { ssr: false });
const ReportsView = dynamic(() => import('@/components/views/reports-view').then(m => ({ default: m.ReportsView })), { ssr: false });
const StatisticsView = dynamic(() => import('@/components/views/statistics-view').then(m => ({ default: m.StatisticsView })), { ssr: false });
const AutomationsView = dynamic(() => import('@/components/views/automations-view').then(m => ({ default: m.AutomationsView })), { ssr: false });
const UsersView = dynamic(() => import('@/components/views/users-view').then(m => ({ default: m.UsersView })), { ssr: false });
const RolesView = dynamic(() => import('@/components/views/roles-view').then(m => ({ default: m.RolesView })), { ssr: false });
const AuditView = dynamic(() => import('@/components/views/audit-view').then(m => ({ default: m.AuditView })), { ssr: false });
const SettingsView = dynamic(() => import('@/components/views/settings-view').then(m => ({ default: m.SettingsView })), { ssr: false });
const ActivityView = dynamic(() => import('@/components/views/activity-view').then(m => ({ default: m.ActivityView })), { ssr: false });
const SprintsView = dynamic(() => import('@/components/views/sprints-view').then(m => ({ default: m.SprintsView })), { ssr: false });
const PlanningView = dynamic(() => import('@/components/views/planning-view').then(m => ({ default: m.PlanningView })), { ssr: false });
const MilestonesView = dynamic(() => import('@/components/views/milestones-view').then(m => ({ default: m.MilestonesView })), { ssr: false });
const TimeTrackingView = dynamic(() => import('@/components/views/time-tracking-view').then(m => ({ default: m.TimeTrackingView })), { ssr: false });
const OrganizationsView = dynamic(() => import('@/components/views/organizations-view').then(m => ({ default: m.OrganizationsView })), { ssr: false });
const DependenciesView = dynamic(() => import('@/components/views/dependencies-view').then(m => ({ default: m.DependenciesView })), { ssr: false });
const CostsView = dynamic(() => import('@/components/views/costs-view').then(m => ({ default: m.CostsView })), { ssr: false });
const RisksView = dynamic(() => import('@/components/views/risks-view').then(m => ({ default: m.RisksView })), { ssr: false });
const StakeholdersView = dynamic(() => import('@/components/views/stakeholders-view').then(m => ({ default: m.StakeholdersView })), { ssr: false });
const ChangeRequestsView = dynamic(() => import('@/components/views/change-requests-view').then(m => ({ default: m.ChangeRequestsView })), { ssr: false });
const WorkloadView = dynamic(() => import('@/components/views/workload-view').then(m => ({ default: m.WorkloadView })), { ssr: false });

const viewMap: Record<string, React.ComponentType> = {
  // Favoris
  dashboard: DashboardView,
  projects: ProjectsView,
  'project-detail': ProjectDetailView,
  'my-tasks': TasksView,
  // Projets
  sprints: SprintsView,
  planning: PlanningView,
  calendar: CalendarView,
  milestones: MilestonesView,
  // Communication
  messages: MessagesView,
  meetings: MeetingsView,
  // Équipe
  members: MembersView,
  teams: TeamsView,
  // Analyse
  statistics: StatisticsView,
  reports: ReportsView,
  // Administration
  users: UsersView,
  roles: RolesView,
  organizations: OrganizationsView,
  audit: AuditView,
  settings: SettingsView,
  // Tools
  automations: AutomationsView,
  'time-tracking': TimeTrackingView,
  activity: ActivityView,
  // PMP — Gestion de projets complexes
  dependencies: DependenciesView,
  costs: CostsView,
  risks: RisksView,
  stakeholders: StakeholdersView,
  'change-requests': ChangeRequestsView,
  workload: WorkloadView,
};

function ViewLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-[oklch(0.55_0.18_250)] border-t-transparent animate-spin" />
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    </div>
  );
}

function AppFooter() {
  const { t } = useTranslation();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <footer className="relative bg-background/50 backdrop-blur-sm px-4 md:px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
      {/* Gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.55_0.18_250/0.2)] to-transparent" />
      <div className="flex items-center gap-3">
        <span className="font-medium text-foreground/60">TeamFlow PM</span>
        <span className="text-muted-foreground/40">{t.footer.version}</span>
        <span className="hidden sm:inline text-muted-foreground/40">•</span>
        <span className="hidden sm:inline">{t.footer.rights}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden sm:flex items-center gap-1.5 text-muted-foreground/60">
          <kbd className="bg-muted border border-border rounded px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
          <span>{t.footer.searchHint?.replace('⌘K ', '') || 'Search'}</span>
        </span>
        {mounted && (
          <span className="flex items-center gap-1.5">
            <span className={cn(
              'h-2 w-2 rounded-full',
              isOnline ? 'bg-emerald-500' : 'bg-amber-500'
            )} />
            <span className="text-muted-foreground/60">{isOnline ? t.footer.online : 'Offline'}</span>
          </span>
        )}
        <button
          onClick={() => useAppStore.getState().setShortcutsHelpOpen(true)}
          className="flex items-center gap-1 hover:text-foreground/80 transition-colors"
        >
          <kbd className="bg-muted border border-border rounded px-1 py-0.5 text-[10px] font-mono">?</kbd>
          <span className="hidden sm:inline">{t.footer.shortcuts}</span>
        </button>
      </div>
    </footer>
  );
}

function BackToTopButton() {
  const { t } = useTranslation();
  const activePage = useAppStore((s) => s.activePage);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const getScrollTop = () => {
      const mainEl = document.getElementById('main-content-area');
      const mainScroll = mainEl?.scrollTop ?? 0;
      const windowScroll = window.scrollY || document.documentElement.scrollTop;
      return Math.max(mainScroll, windowScroll);
    };

    const handleScroll = () => {
      setVisible(getScrollTop() > 300);
    };

    const mainEl = document.getElementById('main-content-area');
    window.addEventListener('scroll', handleScroll, { passive: true });
    mainEl?.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      mainEl?.removeEventListener('scroll', handleScroll);
    };
  }, [activePage]);

  const scrollToTop = () => {
    const mainEl = document.getElementById('main-content-area');
    mainEl?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          title={t.footer.backToTop}
          className={cn(
            'fixed z-40 h-11 w-11 rounded-full',
            'bg-[oklch(0.55_0.18_250)] text-white shadow-lg',
            'hover:shadow-xl hover:bg-[oklch(0.50_0.18_250)] hover:scale-105',
            'active:scale-95 transition-all flex items-center justify-center',
            'border border-white/20 backdrop-blur-sm',
            'bottom-24 right-5 lg:bottom-8 lg:right-8'
          )}
          aria-label={t.footer.backToTop}
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function MainApp() {
  const activePage = useAppStore((s) => s.activePage);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const focusMode = useAppStore((s) => s.focusMode);
  const createTaskDialogOpen = useAppStore((s) => s.createTaskDialogOpen);

  useKeyboardShortcuts();

  useEffect(() => {
    useAppStore.getState().hydrateFavorites();
  }, []);

  useEffect(() => {
    const mainEl = document.getElementById('main-content-area');
    mainEl?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [activePage]);

  const ActiveView = viewMap[activePage] || DashboardView;

  return (
    <AppDataProvider>
    <AppDataSync />
    <SearchDialog />
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <div className={cn('transition-opacity duration-300', focusMode ? 'opacity-30 pointer-events-none' : 'opacity-100')}>
        <AppSidebar />
      </div>

      {/* Main content */}
      <div
        className={cn(
          'flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-[260px]'
        )}
      >
        <TopBar />
        <main
          id="main-content-area"
          className="flex-1 min-h-0 p-4 md:p-6 overflow-y-auto relative bg-background"
        >
          {/* Subtle dot-pattern background overlay */}
          <div className="relative z-10">
            <PageTransition pageId={activePage}>
              <Suspense fallback={<ViewLoader />}>
                <ActiveView />
              </Suspense>
            </PageTransition>
          </div>
        </main>
        <AppFooter />
      </div>

      {/* Back to top button */}
      <BackToTopButton />

      {/* Draggable Quick Action FAB */}
      <DraggableQuickAction />

      {/* Notification Panel (slide-out overlay) */}
      <NotificationPanel />

      {/* Task Detail Drawer */}
      <TaskDetailDrawer />

      {/* Create Task Dialog */}
      {createTaskDialogOpen && <CreateTaskDialog />}

      {/* Create Project Dialog */}
      <CreateProjectDialog />

      {/* Edit Project Dialog */}
      <EditProjectDialog />

      {/* Edit Task Dialog */}
      <EditTaskDialog />

      {/* Create Sprint Dialog */}
      <CreateSprintDialog />

      {/* Create Milestone Dialog */}
      <CreateMilestoneDialog />

      {/* Create Workspace/Organization Dialog */}
      <CreateWorkspaceDialog />

      {/* Keyboard Shortcuts Dialog (legacy, triggered by ?) */}
      <ShortcutsDialog />

      {/* Keyboard Shortcuts Dialog (new, triggered by ⌘/) */}
      <KeyboardShortcutsDialog />

      {/* Toast Notifications */}
      <Toaster />


    </div>
    </AppDataProvider>
  );
}
