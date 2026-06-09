import { create } from 'zustand';
import type { PageId, Organization, Notification, UserRole } from './types';
import type { Locale } from './i18n';

export type TaskViewMode = 'kanban' | 'list' | 'my-tasks';
export type SprintViewMode = 'board' | 'list' | 'timeline';

interface AppState {
  // Navigation
  activePage: PageId;
  setActivePage: (page: PageId) => void;

  // Organization (was Tenant)
  organizations: Organization[];
  activeOrganizationId: string;
  setActiveOrganization: (id: string) => void;
  addOrganization: (org: Organization) => void;

  // Backward-compatible aliases
  tenants: Organization[];
  activeTenantId: string;
  setActiveTenant: (id: string) => void;
  createContentDialogOpen: boolean;
  setCreateContentDialogOpen: (open: boolean) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  // Search
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  // Notifications
  notifications: Notification[];
  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (open: boolean) => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  removeNotification: (id: string) => void;

  // Favorites
  favorites: string[];
  toggleFavorite: (pageId: string) => void;

  // Task detail drawer
  taskDetailOpen: boolean;
  setTaskDetailOpen: (open: boolean) => void;
  selectedTask: Record<string, unknown> | null;
  setSelectedTask: (task: Record<string, unknown> | null) => void;

  // Create task dialog
  createTaskDialogOpen: boolean;
  setCreateTaskDialogOpen: (open: boolean) => void;

  // Create project dialog
  createProjectDialogOpen: boolean;
  setCreateProjectDialogOpen: (open: boolean) => void;

  // Active project
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;

  // Task view mode
  taskViewMode: TaskViewMode;
  setTaskViewMode: (mode: TaskViewMode) => void;

  // Sprint view mode
  sprintViewMode: SprintViewMode;
  setSprintViewMode: (mode: SprintViewMode) => void;

  // Active sprint
  activeSprintId: string | null;
  setActiveSprintId: (id: string | null) => void;

  // Timer state (time tracking)
  timerRunning: boolean;
  timerTaskId: string | null;
  timerStartTime: number | null;
  timerElapsed: number;
  startTimer: (taskId: string) => void;
  stopTimer: () => void;
  tickTimer: () => void;

  // Shortcuts help dialog
  shortcutsHelpOpen: boolean;
  setShortcutsHelpOpen: (open: boolean) => void;
  keyboardShortcutsOpen: boolean;
  setKeyboardShortcutsOpen: (open: boolean) => void;

  // Recent items
  recentItems: string[];
  addRecentItem: (pageId: string) => void;

  // Global API loading indicator
  isApiLoading: boolean;
  setApiLoading: (loading: boolean) => void;

  // Focus mode
  focusMode: boolean;
  setFocusMode: (focus: boolean) => void;
  toggleFocusMode: () => void;

  // Create workspace dialog
  createWorkspaceDialogOpen: boolean;
  setCreateWorkspaceDialogOpen: (open: boolean) => void;
  addWorkspace: (workspace: { id: string; name: string; slug: string; color: string; icon: string }) => void;

  // i18n / Locale
  locale: Locale;
  setLocale: (locale: Locale) => void;

  // Auth
  isAuthenticated: boolean;
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: UserRole;
    organizationId: string;
    organizationName: string;
  } | null;
  login: (email: string, password: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  // Organization (was Tenant)
  organizations: [
    {
      id: 'org-1',
      name: 'Global Corp France',
      slug: 'global-corp-france',
      type: 'company',
      color: '#3b82f6',
      icon: '🏢',
      country: 'France',
      memberCount: 24,
      projectCount: 8,
      isActive: true,
      createdAt: '2024-01-15',
    },
    {
      id: 'org-2',
      name: 'Global Corp RDC',
      slug: 'global-corp-rdc',
      type: 'subsidiary',
      color: '#f59e0b',
      icon: '🌍',
      country: 'RD Congo',
      memberCount: 12,
      projectCount: 4,
      isActive: true,
      createdAt: '2024-03-20',
    },
    {
      id: 'org-3',
      name: 'TechBrand',
      slug: 'techbrand',
      type: 'company',
      color: '#ef4444',
      icon: '💻',
      country: 'France',
      memberCount: 8,
      projectCount: 3,
      isActive: true,
      createdAt: '2024-06-10',
    },
    {
      id: 'org-4',
      name: 'Marketing Dept',
      slug: 'marketing-dept',
      type: 'department',
      color: '#8b5cf6',
      icon: '📣',
      country: 'France',
      memberCount: 6,
      projectCount: 5,
      isActive: true,
      createdAt: '2024-08-01',
    },
  ],
  activeOrganizationId: 'org-1',
  setActiveOrganization: (id) => set({ activeOrganizationId: id, activePage: 'dashboard' }),
  addOrganization: (org) => set((s) => ({ organizations: [...s.organizations, org], tenants: [...s.organizations, org] })),

  // Backward-compatible aliases (tenants = organizations)
  tenants: [
    {
      id: 'org-1',
      name: 'Global Corp France',
      slug: 'global-corp-france',
      type: 'company' as const,
      color: '#3b82f6',
      icon: '🏢',
      country: 'France',
      memberCount: 24,
      projectCount: 8,
      isActive: true,
      createdAt: '2024-01-15',
    },
    {
      id: 'org-2',
      name: 'Global Corp RDC',
      slug: 'global-corp-rdc',
      type: 'subsidiary' as const,
      color: '#f59e0b',
      icon: '🌍',
      country: 'RD Congo',
      memberCount: 12,
      projectCount: 4,
      isActive: true,
      createdAt: '2024-03-20',
    },
    {
      id: 'org-3',
      name: 'TechBrand',
      slug: 'techbrand',
      type: 'company' as const,
      color: '#ef4444',
      icon: '💻',
      country: 'France',
      memberCount: 8,
      projectCount: 3,
      isActive: true,
      createdAt: '2024-06-10',
    },
    {
      id: 'org-4',
      name: 'Marketing Dept',
      slug: 'marketing-dept',
      type: 'department' as const,
      color: '#8b5cf6',
      icon: '📣',
      country: 'France',
      memberCount: 6,
      projectCount: 5,
      isActive: true,
      createdAt: '2024-08-01',
    },
  ],
  activeTenantId: 'org-1',
  setActiveTenant: (id) => set({ activeOrganizationId: id, activeTenantId: id, activePage: 'dashboard' as PageId }),
  createContentDialogOpen: false,
  setCreateContentDialogOpen: (open) => set({ createContentDialogOpen: open }),

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  // Search
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  // Notifications
  notifications: [
    {
      id: 'n1',
      type: 'task_assigned',
      title: 'Tâche assignée',
      message: 'Vous avez été assigné à "Refonte UI Dashboard"',
      read: false,
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'n2',
      type: 'task_completed',
      title: 'Tâche terminée',
      message: 'Jean-Pierre a terminé "API endpoints sprint 4"',
      read: false,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'n3',
      type: 'sprint_started',
      title: 'Sprint démarré',
      message: 'Le Sprint 4 de "Refonte Platform" a démarré',
      read: false,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'n4',
      type: 'deadline_approaching',
      title: 'Échéance proche',
      message: 'La tâche "Module paiement" est due demain',
      read: false,
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'n5',
      type: 'mention',
      title: 'Mention dans un commentaire',
      message: '@vous dans "Sprint Planning Q3"',
      read: true,
      timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'n6',
      type: 'comment_added',
      title: 'Nouveau commentaire',
      message: 'Sophie a commenté "Migration base de données"',
      read: true,
      timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'n7',
      type: 'meeting_reminder',
      title: 'Rappel réunion',
      message: 'Daily standup dans 15 minutes',
      read: true,
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'n8',
      type: 'system',
      title: 'Mise à jour système',
      message: 'TeamFlow PM v2.1 est disponible',
      read: true,
      timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    },
  ],
  notificationPanelOpen: false,
  setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),
  markAllNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  removeNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),

  // Favorites
  favorites: ['dashboard', 'projects', 'my-tasks'],
  toggleFavorite: (pageId) =>
    set((s) => ({
      favorites: s.favorites.includes(pageId)
        ? s.favorites.filter((f) => f !== pageId)
        : [...s.favorites, pageId],
    })),

  // Task detail drawer
  taskDetailOpen: false,
  setTaskDetailOpen: (open) => set({ taskDetailOpen: open }),
  selectedTask: null,
  setSelectedTask: (task) => set({ selectedTask: task, taskDetailOpen: task !== null }),

  // Create task dialog
  createTaskDialogOpen: false,
  setCreateTaskDialogOpen: (open) => set({ createTaskDialogOpen: open }),

  // Create project dialog
  createProjectDialogOpen: false,
  setCreateProjectDialogOpen: (open) => set({ createProjectDialogOpen: open }),

  // Active project
  activeProjectId: null,
  setActiveProjectId: (id) => set({ activeProjectId: id }),

  // Task view mode
  taskViewMode: 'kanban',
  setTaskViewMode: (mode) => set({ taskViewMode: mode }),

  // Sprint view mode
  sprintViewMode: 'board',
  setSprintViewMode: (mode) => set({ sprintViewMode: mode }),

  // Active sprint
  activeSprintId: null,
  setActiveSprintId: (id) => set({ activeSprintId: id }),

  // Timer state (time tracking)
  timerRunning: false,
  timerTaskId: null,
  timerStartTime: null,
  timerElapsed: 0,
  startTimer: (taskId) => set({ timerRunning: true, timerTaskId: taskId, timerStartTime: Date.now(), timerElapsed: 0 }),
  stopTimer: () => set((s) => ({ timerRunning: false, timerElapsed: s.timerStartTime ? s.timerElapsed + (Date.now() - s.timerStartTime) : s.timerElapsed, timerStartTime: null })),
  tickTimer: () => set((s) => {
    if (!s.timerRunning || !s.timerStartTime) return {};
    return { timerElapsed: s.timerElapsed + (Date.now() - s.timerStartTime), timerStartTime: Date.now() };
  }),

  // Shortcuts help dialog
  shortcutsHelpOpen: false,
  setShortcutsHelpOpen: (open) => set({ shortcutsHelpOpen: open }),
  keyboardShortcutsOpen: false,
  setKeyboardShortcutsOpen: (open) => set({ keyboardShortcutsOpen: open }),

  // Recent items
  recentItems: ['dashboard', 'projects', 'my-tasks'],
  addRecentItem: (pageId) =>
    set((s) => {
      const filtered = s.recentItems.filter((id) => id !== pageId);
      return { recentItems: [pageId, ...filtered].slice(0, 8) };
    }),

  // Global API loading indicator
  isApiLoading: false,
  setApiLoading: (loading) => set({ isApiLoading: loading }),

  // Focus mode
  focusMode: false,
  setFocusMode: (focus) => set({ focusMode: focus }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),

  // Create workspace dialog
  createWorkspaceDialogOpen: false,
  setCreateWorkspaceDialogOpen: (open) => set({ createWorkspaceDialogOpen: open }),
  addWorkspace: (workspace) => set((s) => ({
    organizations: [...s.organizations, { ...workspace, type: 'team' as const, country: 'France', memberCount: 1, projectCount: 0, isActive: true, createdAt: new Date().toISOString() } as Organization],
  })),

  // i18n / Locale
  locale: 'fr',
  setLocale: (locale) => set({ locale }),

  // Auth
  isAuthenticated: false,
  currentUser: null,
  login: () =>
    set({
      isAuthenticated: true,
      currentUser: {
        id: 'u-1',
        name: 'Marie Dupont',
        email: 'marie@globalcorp.com',
        avatar: '',
        role: 'org_admin' as UserRole,
        organizationId: 'org-1',
        organizationName: 'Global Corp France',
      },
    }),
  logout: () => set({ isAuthenticated: false, currentUser: null }),
}));
