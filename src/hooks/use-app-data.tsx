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
  const [rawData, setRawData] = useState<AppDataPayload>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = activeOrganizationId
        ? `?workspaceId=${encodeURIComponent(activeOrganizationId)}`
        : '';
      const res = await fetch(`/api/app-data${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as AppDataPayload;
      setRawData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
      setRawData(emptyData);
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
