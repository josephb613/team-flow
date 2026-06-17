import { create } from 'zustand';
import type { PageId, Organization, Notification, UserRole, TaskStatus } from './types';
import { authClient } from '@/lib/auth/client';

export type CreateTaskDefaults = {
  status?: TaskStatus;
  projectId?: string;
};
import type { Locale } from './i18n';

export type TaskViewMode = 'kanban' | 'list' | 'my-tasks';
export type SprintViewMode = 'board' | 'list' | 'timeline';

const FAVORITES_STORAGE_KEY = 'teamflow-favorites';
const DEFAULT_FAVORITES: string[] = [];
const LEGACY_AUTO_FAVORITES = ['dashboard', 'projects', 'my-tasks'];

function normalizeFavorites(favorites: string[]): string[] {
  const isLegacyAutoDefault =
    favorites.length === LEGACY_AUTO_FAVORITES.length &&
    LEGACY_AUTO_FAVORITES.every((id) => favorites.includes(id));
  return isLegacyAutoDefault ? [] : favorites;
}

function readStoredFavorites(): string[] {
  if (typeof window === 'undefined') return DEFAULT_FAVORITES;
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return DEFAULT_FAVORITES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_FAVORITES;
    const normalized = normalizeFavorites(parsed);
    if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
      writeStoredFavorites(normalized);
    }
    return normalized;
  } catch {
    return DEFAULT_FAVORITES;
  }
}

function writeStoredFavorites(favorites: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // ignore quota / private mode errors
  }
}

interface AppState {
  // Navigation
  activePage: PageId;
  setActivePage: (page: PageId) => void;

  // Organization (was Tenant)
  organizations: Organization[];
  activeOrganizationId: string;
  setActiveOrganization: (id: string) => void;
  setOrganizations: (orgs: Organization[]) => void;
  addOrganization: (org: Organization) => void;

  // Backward-compatible aliases
  tenants: Organization[];
  activeTenantId: string;
  setActiveTenant: (id: string) => void;

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
  hydrateFavorites: () => void;
  toggleFavorite: (pageId: string) => void;

  // Task detail drawer
  taskDetailOpen: boolean;
  setTaskDetailOpen: (open: boolean) => void;
  selectedTask: Record<string, unknown> | null;
  setSelectedTask: (task: Record<string, unknown> | null) => void;

  // Create task dialog
  createTaskDialogOpen: boolean;
  createTaskDefaults: CreateTaskDefaults | null;
  setCreateTaskDialogOpen: (open: boolean) => void;
  openCreateTaskDialog: (defaults?: CreateTaskDefaults) => void;

  // Create project dialog
  createProjectDialogOpen: boolean;
  setCreateProjectDialogOpen: (open: boolean) => void;

  // Edit project dialog
  editProjectId: string | null;
  openEditProjectDialog: (id: string) => void;
  closeEditProjectDialog: () => void;

  // Edit task dialog
  editTaskId: string | null;
  openEditTaskDialog: (id: string) => void;
  closeEditTaskDialog: () => void;

  // Create sprint dialog
  createSprintDialogOpen: boolean;
  setCreateSprintDialogOpen: (open: boolean) => void;

  // Create milestone dialog
  createMilestoneDialogOpen: boolean;
  setCreateMilestoneDialogOpen: (open: boolean) => void;

  // Active project
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  openProject: (id: string) => void;

  // Task view mode
  taskViewMode: TaskViewMode;
  setTaskViewMode: (mode: TaskViewMode) => void;

  // Sprint view mode
  sprintViewMode: SprintViewMode;
  setSprintViewMode: (mode: SprintViewMode) => void;

  // Active sprint
  activeSprintId: string | null;
  setActiveSprintId: (id: string | null) => void;

  // Active milestone (task filter navigation)
  activeMilestoneId: string | null;
  setActiveMilestoneId: (id: string | null) => void;
  openMyTasksWithSprintFilter: (sprintId: string) => void;
  openMyTasksWithMilestoneFilter: (milestoneId: string) => void;

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

  // AI Chat
  aiChatOpen: boolean;
  setAiChatOpen: (open: boolean) => void;
  toggleAiChat: () => void;

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
  login: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  register: (
    email: string,
    password: string,
    name: string,
    workspaceName?: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  hydrateSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  // Organization (was Tenant) — loaded from /api/app-data
  organizations: [],
  activeOrganizationId: '',
  setActiveOrganization: (id) =>
    set({
      activeOrganizationId: id,
      activeTenantId: id,
      activePage: 'dashboard',
      activeProjectId: null,
      activeSprintId: null,
      activeMilestoneId: null,
      editProjectId: null,
      editTaskId: null,
      selectedTask: null,
      taskDetailOpen: false,
      createTaskDefaults: null,
      createTaskDialogOpen: false,
      createProjectDialogOpen: false,
      createSprintDialogOpen: false,
      createMilestoneDialogOpen: false,
      timerRunning: false,
      timerTaskId: null,
      timerStartTime: null,
      timerElapsed: 0,
    }),
  setOrganizations: (orgs) =>
    set((s) => ({
      organizations: orgs,
      tenants: orgs,
      activeOrganizationId:
        s.activeOrganizationId && orgs.some((o) => o.id === s.activeOrganizationId)
          ? s.activeOrganizationId
          : (orgs[0]?.id ?? ''),
      activeTenantId:
        s.activeTenantId && orgs.some((o) => o.id === s.activeTenantId)
          ? s.activeTenantId
          : (orgs[0]?.id ?? ''),
    })),
  addOrganization: (org) =>
    set((s) => ({
      organizations: [...s.organizations, org],
      tenants: [...s.tenants, org],
    })),

  // Backward-compatible aliases (tenants = organizations)
  tenants: [],
  activeTenantId: '',
  setActiveTenant: (id) =>
    set({
      activeOrganizationId: id,
      activeTenantId: id,
      activePage: 'dashboard' as PageId,
      activeProjectId: null,
      activeSprintId: null,
      activeMilestoneId: null,
      editProjectId: null,
      editTaskId: null,
      selectedTask: null,
      taskDetailOpen: false,
      createTaskDefaults: null,
      createTaskDialogOpen: false,
      createProjectDialogOpen: false,
      createSprintDialogOpen: false,
      createMilestoneDialogOpen: false,
      timerRunning: false,
      timerTaskId: null,
      timerStartTime: null,
      timerElapsed: 0,
    }),

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  // Search
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  // Notifications — UI-only, not persisted
  notifications: [],
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
  favorites: DEFAULT_FAVORITES,
  hydrateFavorites: () => set({ favorites: readStoredFavorites() }),
  toggleFavorite: (pageId) =>
    set((s) => {
      const favorites = s.favorites.includes(pageId)
        ? s.favorites.filter((f) => f !== pageId)
        : [...s.favorites, pageId];
      writeStoredFavorites(favorites);
      return { favorites };
    }),

  // Task detail drawer
  taskDetailOpen: false,
  setTaskDetailOpen: (open) => set({ taskDetailOpen: open }),
  selectedTask: null,
  setSelectedTask: (task) => set({ selectedTask: task, taskDetailOpen: task !== null }),

  // Create task dialog
  createTaskDialogOpen: false,
  createTaskDefaults: null,
  setCreateTaskDialogOpen: (open) =>
    set({ createTaskDialogOpen: open, ...(open ? {} : { createTaskDefaults: null }) }),
  openCreateTaskDialog: (defaults) =>
    set({ createTaskDialogOpen: true, createTaskDefaults: defaults ?? null }),

  // Create project dialog
  createProjectDialogOpen: false,
  setCreateProjectDialogOpen: (open) => set({ createProjectDialogOpen: open }),

  // Edit project dialog
  editProjectId: null,
  openEditProjectDialog: (id) => set({ editProjectId: id }),
  closeEditProjectDialog: () => set({ editProjectId: null }),

  // Edit task dialog
  editTaskId: null,
  openEditTaskDialog: (id) => set({ editTaskId: id }),
  closeEditTaskDialog: () => set({ editTaskId: null }),

  // Create sprint dialog
  createSprintDialogOpen: false,
  setCreateSprintDialogOpen: (open) => set({ createSprintDialogOpen: open }),

  // Create milestone dialog
  createMilestoneDialogOpen: false,
  setCreateMilestoneDialogOpen: (open) => set({ createMilestoneDialogOpen: open }),

  // Active project
  activeProjectId: null,
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  openProject: (id) =>
    set((s) => {
      const filtered = s.recentItems.filter((item) => item !== 'project-detail');
      return {
        activeProjectId: id,
        activePage: 'project-detail',
        recentItems: ['project-detail', ...filtered].slice(0, 8),
      };
    }),

  // Task view mode
  taskViewMode: 'my-tasks',
  setTaskViewMode: (mode) => set({ taskViewMode: mode }),

  // Sprint view mode
  sprintViewMode: 'board',
  setSprintViewMode: (mode) => set({ sprintViewMode: mode }),

  // Active sprint
  activeSprintId: null,
  setActiveSprintId: (id) => set({ activeSprintId: id }),

  // Active milestone (task filter navigation)
  activeMilestoneId: null,
  setActiveMilestoneId: (id) => set({ activeMilestoneId: id }),
  openMyTasksWithSprintFilter: (sprintId) =>
    set((s) => {
      const filtered = s.recentItems.filter((item) => item !== 'my-tasks');
      return {
        activeSprintId: sprintId,
        activeMilestoneId: null,
        taskViewMode: 'my-tasks',
        activePage: 'my-tasks',
        recentItems: ['my-tasks', ...filtered].slice(0, 8),
      };
    }),
  openMyTasksWithMilestoneFilter: (milestoneId) =>
    set((s) => {
      const filtered = s.recentItems.filter((item) => item !== 'my-tasks');
      return {
        activeSprintId: null,
        activeMilestoneId: milestoneId,
        taskViewMode: 'my-tasks',
        activePage: 'my-tasks',
        recentItems: ['my-tasks', ...filtered].slice(0, 8),
      };
    }),

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

  // AI Chat
  aiChatOpen: false,
  setAiChatOpen: (open) => set({ aiChatOpen: open }),
  toggleAiChat: () => set((s) => ({ aiChatOpen: !s.aiChatOpen })),

  // Create workspace dialog
  createWorkspaceDialogOpen: false,
  setCreateWorkspaceDialogOpen: (open) => set({ createWorkspaceDialogOpen: open }),
  addWorkspace: (workspace) =>
    set((s) => {
      const org: Organization = {
        ...workspace,
        type: 'company',
        country: '',
        memberCount: 1,
        projectCount: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      return {
        organizations: [...s.organizations, org],
        tenants: [...s.tenants, org],
      };
    }),

  // i18n / Locale
  locale: 'fr',
  setLocale: (locale) => set({ locale }),

  // Auth
  isAuthenticated: false,
  currentUser: null,
  hydrateSession: async () => {
    try {
      const { data: session } = await authClient.getSession();
      if (!session?.user) {
        set({ isAuthenticated: false, currentUser: null });
        return;
      }

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok) {
        set({ isAuthenticated: false, currentUser: null });
        return;
      }

      set({
        isAuthenticated: true,
        currentUser: data.user,
        activeOrganizationId: data.user.organizationId ?? '',
        activeTenantId: data.user.organizationId ?? '',
      });
    } catch {
      set({ isAuthenticated: false, currentUser: null });
    }
  },
  login: async (email, password, rememberMe = false) => {
    if (!email || !password) {
      return { ok: false, error: 'Email et mot de passe requis' };
    }
    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        rememberMe,
      });
      if (error) {
        return { ok: false, error: error.message ?? 'Échec de connexion' };
      }

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error ?? 'Échec de synchronisation du compte' };
      }

      set({
        isAuthenticated: true,
        currentUser: data.user,
        activeOrganizationId: data.user.organizationId ?? '',
        activeTenantId: data.user.organizationId ?? '',
      });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Échec de connexion' };
    }
  },
  register: async (email, password, name, workspaceName) => {
    if (!email || !password || !name) {
      return { ok: false, error: 'Tous les champs sont requis' };
    }
    try {
      const { error } = await authClient.signUp.email({ email, password, name });
      if (error) {
        return { ok: false, error: error.message ?? 'Échec de la création du compte' };
      }

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceName: workspaceName || name }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error ?? 'Échec de synchronisation du compte' };
      }

      set({
        isAuthenticated: true,
        currentUser: data.user,
        activeOrganizationId: data.user.organizationId ?? '',
        activeTenantId: data.user.organizationId ?? '',
      });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Échec de la création du compte' };
    }
  },
  logout: async () => {
    try {
      await authClient.signOut();
    } catch {
      // Clear local state even if sign-out request fails
    }
    set({
      isAuthenticated: false,
      currentUser: null,
      organizations: [],
      tenants: [],
      activeOrganizationId: '',
      activeTenantId: '',
    });
  },
}));
