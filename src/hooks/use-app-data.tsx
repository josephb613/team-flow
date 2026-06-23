'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppDataPayload } from '@/lib/data-mappers';
import {
  getProjectName,
  getUserInitials,
  getUserName,
} from '@/lib/data-mappers';
import { useAppStore } from '@/lib/store';
import { filterWorkspaceScope } from '@/lib/workspace-scope';
import type { SprintStatus, TaskPriority, TaskStatus } from '@/lib/types';

const emptyData: AppDataPayload = {
  users: [],
  projects: [],
  tasks: [],
  organizations: [],
  sprints: [],
  milestones: [],
  timeEntries: [],
  automations: [],
  auditLogs: [],
  calendarEvents: [],
  teams: [],
  channels: [],
  meetings: [],
  activities: [],
};

type AppDataContextValue = AppDataPayload & {
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  workspaceProjectIds: Set<string>;
  getUserName: (id: string) => string;
  getUserInitials: (id: string) => string;
  getProjectName: (id: string) => string;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<boolean>;
  updateTaskPriority: (taskId: string, priority: TaskPriority) => Promise<boolean>;
  updateSprintStatus: (sprintId: string, status: SprintStatus) => Promise<boolean>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const activeOrganizationId = useAppStore((s) => s.activeOrganizationId);

  // Lazy state initialization to load cached data synchronously on mount
  const [rawData, setRawData] = useState<AppDataPayload>(() => {
    if (typeof window !== 'undefined') {
      try {
        const activeOrgId = useAppStore.getState().activeOrganizationId;
        const cacheKey = activeOrgId
          ? `teamflow-app-data-${activeOrgId}`
          : 'teamflow-app-data-global';
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as AppDataPayload;
          if (parsed && Array.isArray(parsed.tasks) && Array.isArray(parsed.projects)) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Failed to parse cached app data on mount:', e);
      }
    }
    return emptyData;
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const activeOrgId = useAppStore.getState().activeOrganizationId;
        const cacheKey = activeOrgId
          ? `teamflow-app-data-${activeOrgId}`
          : 'teamflow-app-data-global';
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
            return false; // Skip showing global loader since we have cached tasks
          }
        }
      } catch {}
    }
    return true; // No cached data, show initial spinner
  });

  const [error, setError] = useState<string | null>(null);

  // Synchronously load cache when active organization changes to make workspace switching instant
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cacheKey = activeOrganizationId
          ? `teamflow-app-data-${activeOrganizationId}`
          : 'teamflow-app-data-global';
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as AppDataPayload;
          if (parsed && Array.isArray(parsed.tasks) && Array.isArray(parsed.projects)) {
            setRawData(parsed);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to load cache on organization change:', e);
      }
    }
    setRawData(emptyData);
    setLoading(true);
  }, [activeOrganizationId]);

  const refetch = useCallback(async () => {
    let hasData = false;
    if (typeof window !== 'undefined') {
      try {
        const cacheKey = activeOrganizationId
          ? `teamflow-app-data-${activeOrganizationId}`
          : 'teamflow-app-data-global';
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
            hasData = true;
          }
        }
      } catch {}
    }

    if (!hasData) {
      setLoading(true);
    }
    setError(null);
    try {
      const params = activeOrganizationId
        ? `?workspaceId=${encodeURIComponent(activeOrganizationId)}`
        : '';
      const res = await fetch(`/api/app-data${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as AppDataPayload;
      setRawData(json);

      if (typeof window !== 'undefined') {
        const cacheKey = activeOrganizationId
          ? `teamflow-app-data-${activeOrganizationId}`
          : 'teamflow-app-data-global';
        localStorage.setItem(cacheKey, JSON.stringify(json));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
      if (!hasData) {
        setRawData(emptyData);
      }
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const scopedData = useMemo(
    () => filterWorkspaceScope(rawData, activeOrganizationId),
    [rawData, activeOrganizationId]
  );

  const updateRawTasks = useCallback(
    (updater: (tasks: AppDataPayload['tasks']) => AppDataPayload['tasks']) => {
      setRawData((current) => ({
        ...current,
        tasks: updater(current.tasks),
      }));
    },
    []
  );

  const updateRawSprints = useCallback(
    (updater: (sprints: AppDataPayload['sprints']) => AppDataPayload['sprints']) => {
      setRawData((current) => ({
        ...current,
        sprints: updater(current.sprints),
      }));
    },
    []
  );

  const updateTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      if (status === 'done') {
        useAppStore.getState().openTaskClosureDialog(taskId);
        return false;
      }

      const previousTasks = rawData.tasks;
      updateRawTasks((tasks) =>
        tasks.map((task) =>
          task.id === taskId ? { ...task, status, updatedAt: new Date().toISOString() } : task
        )
      );

      try {
        const params = activeOrganizationId
          ? `?workspaceId=${encodeURIComponent(activeOrganizationId)}`
          : '';
        const res = await fetch(`/api/tasks/${taskId}${params}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return true;
      } catch {
        setRawData((current) => ({ ...current, tasks: previousTasks }));
        return false;
      }
    },
    [rawData.tasks, activeOrganizationId, updateRawTasks]
  );

  const updateTaskPriority = useCallback(
    async (taskId: string, priority: TaskPriority) => {
      const previousTasks = rawData.tasks;
      updateRawTasks((tasks) =>
        tasks.map((task) =>
          task.id === taskId ? { ...task, priority, updatedAt: new Date().toISOString() } : task
        )
      );

      try {
        const params = activeOrganizationId
          ? `?workspaceId=${encodeURIComponent(activeOrganizationId)}`
          : '';
        const res = await fetch(`/api/tasks/${taskId}${params}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return true;
      } catch {
        setRawData((current) => ({ ...current, tasks: previousTasks }));
        return false;
      }
    },
    [rawData.tasks, activeOrganizationId, updateRawTasks]
  );

  const updateSprintStatus = useCallback(
    async (sprintId: string, status: SprintStatus) => {
      const previousSprints = rawData.sprints;
      updateRawSprints((sprints) =>
        sprints.map((sprint) => (sprint.id === sprintId ? { ...sprint, status } : sprint))
      );

      try {
        const params = activeOrganizationId
          ? `?workspaceId=${encodeURIComponent(activeOrganizationId)}`
          : '';
        const res = await fetch(`/api/sprints/${sprintId}${params}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return true;
      } catch {
        setRawData((current) => ({ ...current, sprints: previousSprints }));
        return false;
      }
    },
    [rawData.sprints, activeOrganizationId, updateRawSprints]
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      ...scopedData,
      loading,
      error,
      refetch,
      workspaceProjectIds: scopedData.workspaceProjectIds,
      getUserName: (id: string) => getUserName(scopedData.users, id),
      getUserInitials: (id: string) => getUserInitials(scopedData.users, id),
      getProjectName: (id: string) => getProjectName(scopedData.projects, id),
      updateTaskStatus,
      updateTaskPriority,
      updateSprintStatus,
    }),
    [scopedData, loading, error, refetch, updateTaskStatus, updateTaskPriority, updateSprintStatus]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return ctx;
}
