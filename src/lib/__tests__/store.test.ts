import { describe, it, expect, beforeEach } from "bun:test";
import { useAppStore } from "../store";
import type { Workspace, Notification, User, Channel, TaskStatus } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStore() {
  // Reset the store to its initial state
  useAppStore.setState({
    _hasHydrated: false,
    activePage: "dashboard",
    workspaces: [],
    activeWorkspaceId: "",
    sidebarCollapsed: false,
    mobileSidebarOpen: false,
    searchOpen: false,
    notifications: [],
    notificationCenterOpen: false,
    notificationPanelOpen: false,
    users: [],
    channels: [],
    favorites: [],
    taskViewMode: "kanban",
    locale: "fr",
    taskDetailOpen: false,
    selectedTask: null,
    createWorkspaceDialogOpen: false,
    createTaskDialogOpen: false,
    createProjectDialogOpen: false,
    shortcutsHelpOpen: false,
    keyboardShortcutsOpen: false,
    recentItems: [],
    isApiLoading: false,
    taskCount: 0,
    projectCount: 0,
    messageCount: 0,
    meetingCount: 0,
    isAuthenticated: false,
    currentUser: null,
  });
}

function createMockWorkspace(id = "ws-001"): Workspace {
  return {
    id,
    name: `Workspace ${id}`,
    slug: `workspace-${id}`,
    color: "#3366FF",
    icon: "building",
    createdAt: "2025-01-01T00:00:00.000Z",
  };
}

function createMockNotification(id = "n-001"): Notification {
  return {
    id,
    type: "mention",
    title: "New mention",
    message: "You were mentioned in a comment",
    read: false,
    timestamp: "2025-06-15T10:30:00.000Z",
    actionUrl: "/tasks/task-1",
  };
}

function createMockUser(id = "user-001"): User {
  return {
    id,
    name: `User ${id}`,
    email: `${id}@example.com`,
    avatar: "",
    role: "member",
    status: "online",
  };
}

// ─── Hydration ──────────────────────────────────────────────────────────────

describe("useAppStore - Hydration", () => {
  beforeEach(() => resetStore());

  it("starts with _hasHydrated as false", () => {
    expect(useAppStore.getState()._hasHydrated).toBe(false);
  });

  it("setHasHydrated updates hydration state", () => {
    useAppStore.getState().setHasHydrated(true);
    expect(useAppStore.getState()._hasHydrated).toBe(true);
  });
});

// ─── Navigation ──────────────────────────────────────────────────────────────

describe("useAppStore - Navigation", () => {
  beforeEach(() => resetStore());

  it("has default activePage as 'dashboard'", () => {
    expect(useAppStore.getState().activePage).toBe("dashboard");
  });

  it("setActivePage updates the active page", () => {
    useAppStore.getState().setActivePage("tasks");
    expect(useAppStore.getState().activePage).toBe("tasks");
  });

  it("setActivePage accepts all valid page IDs", () => {
    const pages = [
      "dashboard", "tasks", "projects", "calendar", "messages",
      "meetings", "files", "wiki", "activity", "members",
      "teams", "reports", "automations", "settings",
    ] as const;
    for (const page of pages) {
      useAppStore.getState().setActivePage(page);
      expect(useAppStore.getState().activePage).toBe(page);
    }
  });
});

// ─── Workspace ───────────────────────────────────────────────────────────────

describe("useAppStore - Workspace", () => {
  beforeEach(() => resetStore());

  it("starts with empty workspaces", () => {
    expect(useAppStore.getState().workspaces).toEqual([]);
  });

  it("starts with empty activeWorkspaceId", () => {
    expect(useAppStore.getState().activeWorkspaceId).toBe("");
  });

  it("setActiveWorkspace sets workspace and navigates to dashboard", () => {
    // First set a different page
    useAppStore.getState().setActivePage("tasks");
    useAppStore.getState().setActiveWorkspace("ws-001");
    expect(useAppStore.getState().activeWorkspaceId).toBe("ws-001");
    expect(useAppStore.getState().activePage).toBe("dashboard");
  });

  it("addWorkspace adds a workspace and sets as active if none set", () => {
    const ws = createMockWorkspace("ws-001");
    useAppStore.getState().addWorkspace(ws);
    expect(useAppStore.getState().workspaces.length).toBe(1);
    expect(useAppStore.getState().activeWorkspaceId).toBe("ws-001");
  });

  it("addWorkspace does not override existing activeWorkspaceId", () => {
    const ws1 = createMockWorkspace("ws-001");
    const ws2 = createMockWorkspace("ws-002");
    useAppStore.getState().addWorkspace(ws1);
    useAppStore.getState().addWorkspace(ws2);
    expect(useAppStore.getState().activeWorkspaceId).toBe("ws-001");
  });

  it("setWorkspaces replaces workspaces and auto-selects first if none active", () => {
    const wsList = [createMockWorkspace("ws-a"), createMockWorkspace("ws-b")];
    useAppStore.getState().setWorkspaces(wsList);
    expect(useAppStore.getState().workspaces.length).toBe(2);
    expect(useAppStore.getState().activeWorkspaceId).toBe("ws-a");
  });

  it("setWorkspaces preserves existing activeWorkspaceId if set", () => {
    useAppStore.getState().setActiveWorkspace("ws-specific");
    const wsList = [createMockWorkspace("ws-x"), createMockWorkspace("ws-y")];
    useAppStore.getState().setWorkspaces(wsList);
    expect(useAppStore.getState().activeWorkspaceId).toBe("ws-specific");
  });
});

// ─── Sidebar ─────────────────────────────────────────────────────────────────

describe("useAppStore - Sidebar", () => {
  beforeEach(() => resetStore());

  it("starts with sidebar expanded", () => {
    expect(useAppStore.getState().sidebarCollapsed).toBe(false);
  });

  it("toggleSidebar collapses and expands sidebar", () => {
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarCollapsed).toBe(true);
    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarCollapsed).toBe(false);
  });

  it("starts with mobile sidebar closed", () => {
    expect(useAppStore.getState().mobileSidebarOpen).toBe(false);
  });

  it("setMobileSidebarOpen toggles mobile sidebar", () => {
    useAppStore.getState().setMobileSidebarOpen(true);
    expect(useAppStore.getState().mobileSidebarOpen).toBe(true);
  });
});

// ─── Search ──────────────────────────────────────────────────────────────────

describe("useAppStore - Search", () => {
  beforeEach(() => resetStore());

  it("starts with search closed", () => {
    expect(useAppStore.getState().searchOpen).toBe(false);
  });

  it("setSearchOpen toggles search", () => {
    useAppStore.getState().setSearchOpen(true);
    expect(useAppStore.getState().searchOpen).toBe(true);
  });
});

// ─── Notifications ───────────────────────────────────────────────────────────

describe("useAppStore - Notifications", () => {
  beforeEach(() => resetStore());

  it("starts with empty notifications", () => {
    expect(useAppStore.getState().notifications).toEqual([]);
  });

  it("setNotifications replaces notifications", () => {
    const notifs = [createMockNotification("n-1"), createMockNotification("n-2")];
    useAppStore.getState().setNotifications(notifs);
    expect(useAppStore.getState().notifications.length).toBe(2);
  });

  it("markNotificationRead marks specific notification as read", () => {
    const notifs = [
      createMockNotification("n-1"),
      createMockNotification("n-2"),
    ];
    useAppStore.getState().setNotifications(notifs);
    useAppStore.getState().markNotificationRead("n-1");

    const updated = useAppStore.getState().notifications;
    expect(updated.find((n) => n.id === "n-1")?.read).toBe(true);
    expect(updated.find((n) => n.id === "n-2")?.read).toBe(false);
  });

  it("markAllNotificationsRead marks all as read", () => {
    const notifs = [
      { ...createMockNotification("n-1"), read: false },
      { ...createMockNotification("n-2"), read: false },
    ];
    useAppStore.getState().setNotifications(notifs);
    useAppStore.getState().markAllNotificationsRead();

    const updated = useAppStore.getState().notifications;
    expect(updated.every((n) => n.read)).toBe(true);
  });

  it("removeNotification removes by id", () => {
    const notifs = [
      createMockNotification("n-1"),
      createMockNotification("n-2"),
    ];
    useAppStore.getState().setNotifications(notifs);
    useAppStore.getState().removeNotification("n-1");

    const updated = useAppStore.getState().notifications;
    expect(updated.length).toBe(1);
    expect(updated[0].id).toBe("n-2");
  });

  it("removeNotification is a no-op for non-existent id", () => {
    const notifs = [createMockNotification("n-1")];
    useAppStore.getState().setNotifications(notifs);
    useAppStore.getState().removeNotification("nonexistent");
    expect(useAppStore.getState().notifications.length).toBe(1);
  });
});

// ─── Favorites ───────────────────────────────────────────────────────────────

describe("useAppStore - Favorites", () => {
  beforeEach(() => resetStore());

  it("starts with empty favorites", () => {
    expect(useAppStore.getState().favorites).toEqual([]);
  });

  it("toggleFavorite adds a page to favorites", () => {
    useAppStore.getState().toggleFavorite("tasks");
    expect(useAppStore.getState().favorites).toContain("tasks");
  });

  it("toggleFavorite removes a page from favorites", () => {
    useAppStore.getState().toggleFavorite("tasks");
    useAppStore.getState().toggleFavorite("tasks");
    expect(useAppStore.getState().favorites).not.toContain("tasks");
  });

  it("toggleFavorite handles multiple favorites", () => {
    useAppStore.getState().toggleFavorite("tasks");
    useAppStore.getState().toggleFavorite("projects");
    useAppStore.getState().toggleFavorite("calendar");
    expect(useAppStore.getState().favorites.length).toBe(3);
  });
});

// ─── Task View Mode ──────────────────────────────────────────────────────────

describe("useAppStore - Task View Mode", () => {
  beforeEach(() => resetStore());

  it("defaults to 'kanban'", () => {
    expect(useAppStore.getState().taskViewMode).toBe("kanban");
  });

  it("setTaskViewMode changes the mode", () => {
    useAppStore.getState().setTaskViewMode("list");
    expect(useAppStore.getState().taskViewMode).toBe("list");

    useAppStore.getState().setTaskViewMode("my_tasks");
    expect(useAppStore.getState().taskViewMode).toBe("my_tasks");
  });
});

// ─── Locale ──────────────────────────────────────────────────────────────────

describe("useAppStore - Locale", () => {
  beforeEach(() => resetStore());

  it("defaults to 'fr'", () => {
    expect(useAppStore.getState().locale).toBe("fr");
  });

  it("setLocale changes locale", () => {
    useAppStore.getState().setLocale("en");
    expect(useAppStore.getState().locale).toBe("en");
  });
});

// ─── Task Detail Drawer ─────────────────────────────────────────────────────

describe("useAppStore - Task Detail", () => {
  beforeEach(() => resetStore());

  it("starts with drawer closed and no selected task", () => {
    expect(useAppStore.getState().taskDetailOpen).toBe(false);
    expect(useAppStore.getState().selectedTask).toBeNull();
  });

  it("setSelectedTask opens drawer and sets task", () => {
    const task = { id: "task-1", title: "Test Task", status: "todo" };
    useAppStore.getState().setSelectedTask(task);
    expect(useAppStore.getState().taskDetailOpen).toBe(true);
    expect(useAppStore.getState().selectedTask).toEqual(task);
  });

  it("setSelectedTask with null closes drawer", () => {
    const task = { id: "task-1", title: "Test Task" };
    useAppStore.getState().setSelectedTask(task);
    useAppStore.getState().setSelectedTask(null);
    expect(useAppStore.getState().taskDetailOpen).toBe(false);
    expect(useAppStore.getState().selectedTask).toBeNull();
  });

  it("updateTaskStatus updates the selected task status", () => {
    const task = { id: "task-1", title: "Test Task", status: "todo" as TaskStatus };
    useAppStore.getState().setSelectedTask(task);
    useAppStore.getState().updateTaskStatus("task-1", "in_progress");

    const updated = useAppStore.getState().selectedTask as Record<string, unknown>;
    expect(updated?.status).toBe("in_progress");
  });

  it("updateTaskStatus does nothing for non-matching task id", () => {
    const task = { id: "task-1", title: "Test Task", status: "todo" as TaskStatus };
    useAppStore.getState().setSelectedTask(task);
    useAppStore.getState().updateTaskStatus("task-2", "done");

    const unchanged = useAppStore.getState().selectedTask as Record<string, unknown>;
    expect(unchanged?.status).toBe("todo");
  });
});

// ─── Dialogs ─────────────────────────────────────────────────────────────────

describe("useAppStore - Dialogs", () => {
  beforeEach(() => resetStore());

  it("starts with all dialogs closed", () => {
    expect(useAppStore.getState().createWorkspaceDialogOpen).toBe(false);
    expect(useAppStore.getState().createTaskDialogOpen).toBe(false);
    expect(useAppStore.getState().createProjectDialogOpen).toBe(false);
    expect(useAppStore.getState().shortcutsHelpOpen).toBe(false);
    expect(useAppStore.getState().keyboardShortcutsOpen).toBe(false);
  });

  it("opens and closes workspace dialog", () => {
    useAppStore.getState().setCreateWorkspaceDialogOpen(true);
    expect(useAppStore.getState().createWorkspaceDialogOpen).toBe(true);
    useAppStore.getState().setCreateWorkspaceDialogOpen(false);
    expect(useAppStore.getState().createWorkspaceDialogOpen).toBe(false);
  });

  it("opens and closes task dialog", () => {
    useAppStore.getState().setCreateTaskDialogOpen(true);
    expect(useAppStore.getState().createTaskDialogOpen).toBe(true);
  });

  it("opens and closes project dialog", () => {
    useAppStore.getState().setCreateProjectDialogOpen(true);
    expect(useAppStore.getState().createProjectDialogOpen).toBe(true);
  });
});

// ─── Recent Items ────────────────────────────────────────────────────────────

describe("useAppStore - Recent Items", () => {
  beforeEach(() => resetStore());

  it("starts with empty recent items", () => {
    expect(useAppStore.getState().recentItems).toEqual([]);
  });

  it("addRecentItem adds a page to the front", () => {
    useAppStore.getState().addRecentItem("tasks");
    expect(useAppStore.getState().recentItems[0]).toBe("tasks");
  });

  it("addRecentItem avoids duplicates", () => {
    useAppStore.getState().addRecentItem("tasks");
    useAppStore.getState().addRecentItem("projects");
    useAppStore.getState().addRecentItem("tasks"); // Duplicate
    const items = useAppStore.getState().recentItems;
    expect(items.filter((i) => i === "tasks").length).toBe(1);
    expect(items[0]).toBe("tasks"); // Most recent first
  });

  it("addRecentItem caps at 8 items", () => {
    for (let i = 0; i < 15; i++) {
      useAppStore.getState().addRecentItem(`page-${i}`);
    }
    expect(useAppStore.getState().recentItems.length).toBeLessThanOrEqual(8);
  });
});

// ─── API Loading ─────────────────────────────────────────────────────────────

describe("useAppStore - API Loading", () => {
  beforeEach(() => resetStore());

  it("starts with isApiLoading false", () => {
    expect(useAppStore.getState().isApiLoading).toBe(false);
  });

  it("setApiLoading toggles loading state", () => {
    useAppStore.getState().setApiLoading(true);
    expect(useAppStore.getState().isApiLoading).toBe(true);
    useAppStore.getState().setApiLoading(false);
    expect(useAppStore.getState().isApiLoading).toBe(false);
  });
});

// ─── Counts ──────────────────────────────────────────────────────────────────

describe("useAppStore - Counts", () => {
  beforeEach(() => resetStore());

  it("starts with zero counts", () => {
    expect(useAppStore.getState().taskCount).toBe(0);
    expect(useAppStore.getState().projectCount).toBe(0);
    expect(useAppStore.getState().messageCount).toBe(0);
    expect(useAppStore.getState().meetingCount).toBe(0);
  });

  it("setCounts partially updates counts", () => {
    useAppStore.getState().setCounts({ taskCount: 42, projectCount: 7 });
    expect(useAppStore.getState().taskCount).toBe(42);
    expect(useAppStore.getState().projectCount).toBe(7);
    expect(useAppStore.getState().messageCount).toBe(0); // unchanged
  });

  it("setCounts updates all counts at once", () => {
    useAppStore.getState().setCounts({
      taskCount: 10,
      projectCount: 5,
      messageCount: 3,
      meetingCount: 2,
    });
    expect(useAppStore.getState().taskCount).toBe(10);
    expect(useAppStore.getState().projectCount).toBe(5);
    expect(useAppStore.getState().messageCount).toBe(3);
    expect(useAppStore.getState().meetingCount).toBe(2);
  });
});

// ─── Auth ────────────────────────────────────────────────────────────────────

describe("useAppStore - Auth", () => {
  beforeEach(() => resetStore());

  it("starts unauthenticated with null currentUser", () => {
    expect(useAppStore.getState().isAuthenticated).toBe(false);
    expect(useAppStore.getState().currentUser).toBeNull();
  });

  it("setCurrentUser sets the user and marks as authenticated", () => {
    const user = {
      id: "user-001",
      name: "John",
      email: "john@example.com",
      avatar: "",
      role: "admin",
    };
    useAppStore.getState().setCurrentUser(user);
    expect(useAppStore.getState().isAuthenticated).toBe(true);
    expect(useAppStore.getState().currentUser).toEqual(user);
  });

  it("setCurrentUser with null marks as unauthenticated", () => {
    const user = {
      id: "user-001",
      name: "John",
      email: "john@example.com",
      avatar: "",
      role: "admin",
    };
    useAppStore.getState().setCurrentUser(user);
    useAppStore.getState().setCurrentUser(null);
    expect(useAppStore.getState().isAuthenticated).toBe(false);
    expect(useAppStore.getState().currentUser).toBeNull();
  });

  it("logout clears all user data", () => {
    // Setup some state
    useAppStore.getState().setCurrentUser({
      id: "user-001",
      name: "John",
      email: "john@example.com",
      avatar: "",
      role: "admin",
    });
    useAppStore.getState().addWorkspace(createMockWorkspace());
    useAppStore.getState().setNotifications([createMockNotification()]);
    useAppStore.getState().setUsers([createMockUser()]);
    useAppStore.getState().toggleFavorite("tasks");
    useAppStore.getState().addRecentItem("dashboard");

    // Logout
    useAppStore.getState().logout();

    const state = useAppStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.currentUser).toBeNull();
    expect(state.workspaces).toEqual([]);
    expect(state.activeWorkspaceId).toBe("");
    expect(state.notifications).toEqual([]);
    expect(state.users).toEqual([]);
    expect(state.channels).toEqual([]);
    expect(state.favorites).toEqual([]);
    expect(state.recentItems).toEqual([]);
  });

  it("login is a no-op (handled by NextAuth)", () => {
    // login should not throw
    expect(() => useAppStore.getState().login()).not.toThrow();
    // State should remain unchanged
    expect(useAppStore.getState().isAuthenticated).toBe(false);
  });
});

// ─── Users & Channels ────────────────────────────────────────────────────────

describe("useAppStore - Users & Channels", () => {
  beforeEach(() => resetStore());

  it("starts with empty users and channels", () => {
    expect(useAppStore.getState().users).toEqual([]);
    expect(useAppStore.getState().channels).toEqual([]);
  });

  it("setUsers sets the users array", () => {
    const users = [createMockUser("u-1"), createMockUser("u-2")];
    useAppStore.getState().setUsers(users);
    expect(useAppStore.getState().users.length).toBe(2);
  });

  it("setChannels sets the channels array", () => {
    const channels: Channel[] = [
      {
        id: "ch-1",
        name: "general",
        type: "project",
        members: ["user-1"],
        unread: 0,
      },
    ];
    useAppStore.getState().setChannels(channels);
    expect(useAppStore.getState().channels.length).toBe(1);
  });
});
