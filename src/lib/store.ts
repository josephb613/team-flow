import { create } from "zustand";
import { authClient } from "@/lib/auth/client";
import type {
  PageId,
  Workspace,
  Notification,
  TaskStatus,
  User,
  Channel,
  WorkspaceMember,
  Invitation,
  BoardColumn,
  Task,
  Project,
  Opportunity,
} from "./types";
import type { Locale } from "./i18n";

interface AppState {
  // Navigation
  activePage: PageId;
  setActivePage: (page: PageId) => void;

  // Workspace
  workspaces: Workspace[];
  activeWorkspaceId: string;
  setActiveWorkspace: (id: string) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, data: Partial<Workspace>) => void;
  removeWorkspace: (id: string) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;

  // Board Columns (for Kanban)
  columns: BoardColumn[];
  setColumns: (columns: BoardColumn[]) => void;
  columnsOpportunity: BoardColumn[];
  setColumnsOpportunity: (columns: BoardColumn[]) => void;

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
  setNotifications: (notifications: Notification[]) => void;
  notificationCenterOpen: boolean;
  setNotificationCenterOpen: (open: boolean) => void;
  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (open: boolean) => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  removeNotification: (id: string) => void;

  // Users & Channels (loaded from API)
  users: User[];
  setUsers: (users: User[]) => void;
  channels: Channel[];
  setChannels: (channels: Channel[]) => void;

  // Favorites
  favorites: string[];
  toggleFavorite: (pageId: string) => void;

  // Task view mode
  taskViewMode: "list" | "kanban" | "my_tasks";
  setTaskViewMode: (mode: "list" | "kanban" | "my_tasks") => void;

  // i18n / Locale
  locale: Locale;
  setLocale: (locale: Locale) => void;

  // Task detail drawer
  taskDetailOpen: boolean;
  setTaskDetailOpen: (open: boolean) => void;
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  editingTask: Task | null;
  setEditingTask: (task: Task | null) => void;

  // Project detail drawer
  projectDetailOpen: boolean;
  setProjectDetailOpen: (open: boolean) => void;
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  // Track locally deleted project IDs so they disappear from the list
  deletedProjectIds: string[];
  addDeletedProjectId: (id: string) => void;

  // Member detail drawer
  memberDetailOpen: boolean;
  setMemberDetailOpen: (open: boolean) => void;
  selectedMember: (User & { workspaceRole?: string; joinedAt?: string }) | null;
  setSelectedMember: (
    member: (User & { workspaceRole?: string; joinedAt?: string }) | null,
  ) => void;

  // Create workspace dialog
  createWorkspaceDialogOpen: boolean;
  setCreateWorkspaceDialogOpen: (open: boolean) => void;

  // Invite member dialog
  inviteMemberDialogOpen: boolean;
  setInviteMemberDialogOpen: (open: boolean) => void;

  // Pending invitations
  pendingInvitations: Invitation[];
  setPendingInvitations: (invitations: Invitation[]) => void;

  // Create task dialog
  createTaskDialogOpen: boolean;
  setCreateTaskDialogOpen: (open: boolean) => void;

  // Create project dialog
  createProjectDialogOpen: boolean;
  setCreateProjectDialogOpen: (open: boolean) => void;

  // Create team dialog
  createTeamDialogOpen: boolean;
  setCreateTeamDialogOpen: (open: boolean) => void;
  deletedTeamIds: string[];
  addDeletedTeamId: (id: string) => void;
  teamRefetchKey: number;
  triggerTeamRefetch: () => void;

  // Team management
  teamManagementId: string | null;
  setTeamManagementId: (id: string | null) => void;

  // Create channel dialog
  createChannelDialogOpen: boolean;
  setCreateChannelDialogOpen: (open: boolean) => void;
  addChannel: (channel: Channel) => void;

  // Shortcuts help dialog
  shortcutsHelpOpen: boolean;
  setShortcutsHelpOpen: (open: boolean) => void;

  // Keyboard shortcuts dialog
  keyboardShortcutsOpen: boolean;
  setKeyboardShortcutsOpen: (open: boolean) => void;

  // What's new dialog
  whatsNewDialogOpen: boolean;
  setWhatsNewDialogOpen: (open: boolean) => void;

  // Opportunity view mode
  opportunityViewMode: "list" | "kanban";
  setOpportunityViewMode: (mode: "list" | "kanban") => void;

  // Create opportunity dialog
  createOpportunityDialogOpen: boolean;
  setCreateOpportunityDialogOpen: (open: boolean) => void;

  // Opportunity count for sidebar badge
  opportunityCount: number;
  setOpportunityCount: (count: number) => void;

  // Edit opportunity
  editingOpportunity: Opportunity | null;
  setEditingOpportunity: (opp: Opportunity | null) => void;

  // Recent items
  recentItems: string[];
  addRecentItem: (pageId: string) => void;

  // Global API loading indicator
  isApiLoading: boolean;
  setApiLoading: (loading: boolean) => void;

  // Trello integration dialog (rendered in MainApp outside AnimatePresence)
  trelloDialogOpen: boolean;
  setTrelloDialogOpen: (open: boolean) => void;

  // Counts for sidebar badges (updated by useDashboardData)
  taskCount: number;
  projectCount: number;
  messageCount: number;
  meetingCount: number;
  setCounts: (counts: {
    taskCount?: number;
    projectCount?: number;
    messageCount?: number;
    meetingCount?: number;
  }) => void;

  // Auth
  isAuthenticated: boolean;
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: string;
  } | null;
  setCurrentUser: (
    user: {
      id: string;
      name: string;
      email: string;
      avatar: string;
      role: string;
    } | null,
  ) => void;
  login: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  activePage: "dashboard",
  setActivePage: (page) => set({ activePage: page }),

  // Workspace - start empty, loaded from API after login
  workspaces: [],
  activeWorkspaceId: "",
  setActiveWorkspace: (id) =>
    set({ activeWorkspaceId: id, activePage: "dashboard" }),
  addWorkspace: (workspace) =>
    set((s) => ({
      workspaces: [...s.workspaces, workspace],
      activeWorkspaceId: s.activeWorkspaceId || workspace.id,
    })),
  updateWorkspace: (id, data) =>
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === id ? { ...w, ...data } : w,
      ),
    })),
  removeWorkspace: (id) =>
    set((s) => {
      const remaining = s.workspaces.filter((w) => w.id !== id);
      const newActiveId =
        s.activeWorkspaceId === id
          ? remaining.length > 0
            ? remaining[0].id
            : ""
          : s.activeWorkspaceId;
      return {
        workspaces: remaining,
        activeWorkspaceId: newActiveId,
        activePage: newActiveId ? s.activePage : "dashboard",
      };
    }),
  setWorkspaces: (workspaces) =>
    set((s) => ({
      workspaces,
      activeWorkspaceId:
        workspaces.length > 0 && !s.activeWorkspaceId
          ? workspaces[0].id
          : s.activeWorkspaceId,
    })),

  // Board Columns
  columns: [],
  setColumns: (columns) => set({ columns }),
  columnsOpportunity: [],
  setColumnsOpportunity: (columns) => set({ columnsOpportunity: columns }),

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  // Search
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  // Notifications - start empty, loaded from API after login
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  notificationCenterOpen: false,
  setNotificationCenterOpen: (open) => set({ notificationCenterOpen: open }),
  notificationPanelOpen: false,
  setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),
  markAllNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })),
  removeNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),

  // Users & Channels - start empty, loaded from API after login
  users: [],
  setUsers: (users) => set({ users }),
  channels: [],
  setChannels: (channels) => set({ channels }),

  // Favorites
  favorites: [],
  toggleFavorite: (pageId) =>
    set((s) => ({
      favorites: s.favorites.includes(pageId)
        ? s.favorites.filter((f) => f !== pageId)
        : [...s.favorites, pageId],
    })),

  // Task view mode
  taskViewMode: "kanban",
  setTaskViewMode: (mode) => set({ taskViewMode: mode }),

  // i18n / Locale
  locale: "fr",
  setLocale: (locale) => set({ locale }),

  // Task detail drawer
  taskDetailOpen: false,
  setTaskDetailOpen: (open) => set({ taskDetailOpen: open }),
  selectedTask: null,
  setSelectedTask: (task) =>
    set({ selectedTask: task, taskDetailOpen: task !== null }),
  updateTaskStatus: (taskId, status) =>
    set((s) => {
      if (!s.selectedTask) return s;
      const task = s.selectedTask;
      if (task.id !== taskId) return s;
      return { selectedTask: { ...task, status } };
    }),
  editingTask: null,
  setEditingTask: (task) => set({ editingTask: task }),

  // Project detail drawer
  projectDetailOpen: false,
  setProjectDetailOpen: (open) => set({ projectDetailOpen: open }),
  selectedProject: null,
  setSelectedProject: (project) =>
    set({ selectedProject: project, projectDetailOpen: project !== null }),
  deletedProjectIds: [],
  addDeletedProjectId: (id) =>
    set((s) => ({
      deletedProjectIds: [...s.deletedProjectIds, id],
    })),

  // Member detail drawer
  memberDetailOpen: false,
  setMemberDetailOpen: (open) => set({ memberDetailOpen: open }),
  selectedMember: null,
  setSelectedMember: (member) =>
    set({ selectedMember: member, memberDetailOpen: member !== null }),

  // Create workspace dialog
  createWorkspaceDialogOpen: false,
  setCreateWorkspaceDialogOpen: (open) =>
    set({ createWorkspaceDialogOpen: open }),

  // Invite member dialog
  inviteMemberDialogOpen: false,
  setInviteMemberDialogOpen: (open) => set({ inviteMemberDialogOpen: open }),

  // Pending invitations
  pendingInvitations: [],
  setPendingInvitations: (invitations) =>
    set({ pendingInvitations: invitations }),

  // Create task dialog
  createTaskDialogOpen: false,
  setCreateTaskDialogOpen: (open) => set({ createTaskDialogOpen: open }),

  // Create project dialog
  createProjectDialogOpen: false,
  setCreateProjectDialogOpen: (open) => set({ createProjectDialogOpen: open }),

  // Create team dialog
  createTeamDialogOpen: false,
  setCreateTeamDialogOpen: (open) => set({ createTeamDialogOpen: open }),
  deletedTeamIds: [],
  addDeletedTeamId: (id) =>
    set((s) => ({
      deletedTeamIds: [...s.deletedTeamIds, id],
    })),
  teamRefetchKey: 0,
  triggerTeamRefetch: () =>
    set((s) => ({ teamRefetchKey: s.teamRefetchKey + 1 })),

  // Team management
  teamManagementId: null,
  setTeamManagementId: (id) => set({ teamManagementId: id }),

  // Create channel dialog
  createChannelDialogOpen: false,
  setCreateChannelDialogOpen: (open) => set({ createChannelDialogOpen: open }),
  addChannel: (channel) => set((s) => ({ channels: [...s.channels, channel] })),

  // Shortcuts help dialog
  shortcutsHelpOpen: false,
  setShortcutsHelpOpen: (open) => set({ shortcutsHelpOpen: open }),

  // Keyboard shortcuts dialog
  keyboardShortcutsOpen: false,
  setKeyboardShortcutsOpen: (open) => set({ keyboardShortcutsOpen: open }),

  // What's new dialog
  whatsNewDialogOpen: false,
  setWhatsNewDialogOpen: (open) => set({ whatsNewDialogOpen: open }),

  // Opportunity view mode
  opportunityViewMode: "kanban",
  setOpportunityViewMode: (mode) => set({ opportunityViewMode: mode }),

  // Create opportunity dialog
  createOpportunityDialogOpen: false,
  setCreateOpportunityDialogOpen: (open) =>
    set({ createOpportunityDialogOpen: open }),

  // Opportunity count for sidebar badge
  opportunityCount: 0,
  setOpportunityCount: (count) => set({ opportunityCount: count }),

  // Edit opportunity
  editingOpportunity: null,
  setEditingOpportunity: (opp) => set({ editingOpportunity: opp }),

  // Recent items
  recentItems: [],
  addRecentItem: (pageId) =>
    set((s) => {
      const filtered = s.recentItems.filter((id) => id !== pageId);
      return { recentItems: [pageId, ...filtered].slice(0, 8) };
    }),

  // Global API loading indicator
  isApiLoading: false,
  setApiLoading: (loading) => set({ isApiLoading: loading }),

  // Trello integration dialog
  trelloDialogOpen: false,
  setTrelloDialogOpen: (open) => set({ trelloDialogOpen: open }),

  // Counts for sidebar badges
  taskCount: 0,
  projectCount: 0,
  messageCount: 0,
  meetingCount: 0,
  setCounts: (counts) => set((s) => ({ ...s, ...counts })),

  // Auth
  isAuthenticated: false,
  currentUser: null,
  setCurrentUser: (user) =>
    set({
      isAuthenticated: user !== null,
      currentUser: user,
    }),
  // login is a no-op now; real auth is handled by Neon Auth via setCurrentUser
  login: () => {
    // Auth is managed by Neon Auth session (see page.tsx).
    // Call setCurrentUser with real session data instead.
  },
  logout: () => {
    set({
      isAuthenticated: false,
      currentUser: null,
      workspaces: [],
      activeWorkspaceId: "",
      notifications: [],
      users: [],
      channels: [],
      favorites: [],
      recentItems: [],
    });
    authClient.signOut().then(() => {
      window.location.href = "/";
    });
  },
}));
