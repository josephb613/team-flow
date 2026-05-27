"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  X,
  Calendar,
  Clock,
  MessageSquare,
  Pencil,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  AlertCircle,
  Send,
  Flame,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  GitBranch,
  UserPlus,
  CalendarClock,
  ListTodo,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  Task,
  TaskStatus,
  TaskPriority,
  User,
  Project,
  Comment,
  ActivityItem,
  ProjectPhase,
} from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import { cn } from "@/lib/utils";
import {
  buildStatusConfig,
  DEFAULT_COLUMNS,
  ICON_MAP,
} from "@/lib/column-utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const priorityConfig: Record<
  TaskPriority,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
    solidBg: string;
  }
> = {
  urgent: {
    label: "Urgent",
    color: "text-rose-600",
    bg: "bg-rose-500/10 border-rose-200",
    icon: <Flame className="h-3.5 w-3.5" />,
    solidBg: "bg-rose-500 text-white",
  },
  high: {
    label: "High",
    color: "text-amber-600",
    bg: "bg-amber-500/10 border-amber-200",
    icon: <ArrowUp className="h-3.5 w-3.5" />,
    solidBg: "bg-amber-500 text-white",
  },
  medium: {
    label: "Medium",
    color: "text-cyan-600",
    bg: "bg-cyan-500/10 border-cyan-200",
    icon: <ArrowRight className="h-3.5 w-3.5" />,
    solidBg: "bg-cyan-500 text-white",
  },
  low: {
    label: "Low",
    color: "text-emerald-600",
    bg: "bg-emerald-500/10 border-emerald-200",
    icon: <ArrowDown className="h-3.5 w-3.5" />,
    solidBg: "bg-emerald-500 text-white",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function getUserInitials(users: User[], id?: string) {
  if (!id) return "??";
  const user = users.find((u) => u.id === id);
  return user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "??";
}

function getUserName(users: User[], id?: string) {
  if (!id) return "Unknown";
  return users.find((u) => u.id === id)?.name || "Unknown";
}

function getProjectName(projects: Project[], id?: string) {
  if (!id) return "Unknown";
  return projects.find((p) => p.id === id)?.name || "Unknown";
}

function getProjectColor(projects: Project[], id?: string) {
  if (!id) return "#10b981";
  return projects.find((p) => p.id === id)?.color || "#10b981";
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getActivityIcon(type: string): React.ReactNode {
  switch (type) {
    case "task_created":
      return <Circle className="h-3 w-3" />;
    case "task_completed":
      return <CheckCircle2 className="h-3 w-3" />;
    case "task_updated":
    case "task_reopened":
      return <GitBranch className="h-3 w-3" />;
    case "comment_added":
      return <MessageSquare className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
}

// ─── API response type for full task detail ──────────────────────────────

interface TaskDetailResponse extends Task {
  comments: Comment[];
  assignee?: User;
  creator?: User;
  projectRel?: Project;
}

// ─── Component ───────────────────────────────────────────────────────────

export function TaskDetailDrawer() {
  const {
    taskDetailOpen,
    setTaskDetailOpen,
    selectedTask,
    setSelectedTask,
    updateTaskStatus,
    columns,
    currentUser,
  } = useAppStore();
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [taskDetail, setTaskDetail] = useState<TaskDetailResponse | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityItem[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const mountedRef = useRef(true);

  // Track mounted state for safe async operations
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ─── API Data ──────────────────────────────────────────────────────────
  // useApiQuery auto-adds workspaceId when scoped=true (default)
  const { data: projectsData } = useApiQuery<Project[]>("/api/projects");
  const { data: usersData } = useApiQuery<User[]>("/api/users");
  const { data: phasesData } = useApiQuery<ProjectPhase[]>("/api/phases");
  const projects = projectsData || [];
  const users = (usersData as User[]) || [];
  const phases = (phasesData as ProjectPhase[]) || [];

  // ─── Fetch full task detail when drawer opens ──────────────────────────
  const taskId = selectedTask?.id ?? null;

  useEffect(() => {
    if (!taskDetailOpen || !taskId) {
      setTaskDetail(null);
      setComments([]);
      setActivityLogs([]);
      setNewSubtaskText("");
      setEditingSubtaskId(null);
      setEditingSubtaskTitle("");
      return;
    }

    const abortController = new AbortController();
    let cancelled = false;

    async function fetchTaskDetail() {
      setIsLoadingDetail(true);
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          signal: abortController.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setTaskDetail(data as TaskDetailResponse);
          setComments(data.comments || []);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!cancelled) {
          // Fallback to the task data from the store if API fails
          setTaskDetail(selectedTask as unknown as TaskDetailResponse);
          setComments([]);
        }
      } finally {
        if (!cancelled) setIsLoadingDetail(false);
      }
    }

    async function fetchActivityLogs() {
      setIsLoadingActivity(true);
      try {
        const res = await fetch(
          `/api/activity?targetId=${encodeURIComponent(taskId!)}&targetType=task`,
          { signal: abortController.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setActivityLogs(data as ActivityItem[]);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!cancelled) setActivityLogs([]);
      } finally {
        if (!cancelled) setIsLoadingActivity(false);
      }
    }

    fetchTaskDetail();
    fetchActivityLogs();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [taskDetailOpen, taskId, selectedTask]);

  const statusConfig = useMemo(
    () => buildStatusConfig(columns.length > 0 ? columns : DEFAULT_COLUMNS),
    [columns],
  );

  const task = (taskDetail ?? selectedTask) as Task | undefined;

  const projectPhases = useMemo(() => {
    if (!task?.projectId) return [];
    return phases.filter((p) => p.projectId === task.projectId);
  }, [phases, task?.projectId]);

  const currentPhaseName = useMemo(() => {
    if (!task?.phaseId) return "Aucune phase";
    const phase = task.phase || phases.find((p) => p.id === task.phaseId);
    return phase ? phase.name : "Aucune phase";
  }, [phases, task?.phaseId, task?.phase]);

  const status = statusConfig[task?.status || "backlog"];
  const statusLabel = task
    ? columns.find((c) => c.slug === task.status)?.name || task.status
    : "";
  const priority = task ? priorityConfig[task.priority] : priorityConfig.medium;
  const subtaskDone = task
    ? task.subtasks.filter((s) => s.completed).length
    : 0;
  const subtaskTotal = task ? task.subtasks.length : 0;
  const subtaskPercent =
    subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    const oldLabel =
      columns.find((c) => c.slug === task.status)?.name || task.status;
    const newLabel =
      columns.find((c) => c.slug === newStatus)?.name || newStatus;
    const oldStatus = task.status;

    // Optimistic local update
    updateTaskStatus(task.id, newStatus);
    // Also update local detail state
    if (taskDetail) {
      setTaskDetail({ ...taskDetail, status: newStatus as TaskStatus });
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success(
        t.taskDetail.statusChanged
          .replace("{from}", oldLabel)
          .replace("{to}", newLabel),
      );

      // Invalider le cache pour que les vues (Kanban/Liste) se mettent à jour
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["phases"] });

      // Refresh activity logs after status change
      const actRes = await fetch(
        `/api/activity?targetId=${encodeURIComponent(task.id)}&targetType=task`,
      );
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivityLogs(actData as ActivityItem[]);
      }
    } catch {
      // Rollback on failure
      updateTaskStatus(task.id, oldStatus);
      if (taskDetail) {
        setTaskDetail({ ...taskDetail, status: oldStatus });
      }
      toast.error(t.taskDetail.statusUpdateFailed);
    }
  };

  const handlePhaseChange = async (newPhaseId: string) => {
    if (!task) return;
    const oldPhaseId = task.phaseId;
    const nextPhaseId = newPhaseId || null;
    const nextPhase = phases.find((p) => p.id === nextPhaseId) || null;

    // Optimistic local update
    if (taskDetail) {
      setTaskDetail({
        ...taskDetail,
        phaseId: nextPhaseId,
        phase: nextPhase,
      });
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId: nextPhaseId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Phase de la tâche mise à jour");

      // Invalidate cache to update other views
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["phases"] });

      // Refresh activity logs
      const actRes = await fetch(
        `/api/activity?targetId=${encodeURIComponent(task.id)}&targetType=task`,
      );
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivityLogs(actData as ActivityItem[]);
      }
    } catch {
      // Rollback
      if (taskDetail) {
        setTaskDetail({
          ...taskDetail,
          phaseId: oldPhaseId,
          phase: phases.find((p) => p.id === oldPhaseId) || null,
        });
      }
      toast.error("Échec de la mise à jour de la phase");
    }
  };

  const handleAddComment = async () => {
    if (!task || !commentText.trim()) return;

    const tempText = commentText.trim();
    setCommentText("");

    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tempText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newComment = (await res.json()) as Comment;
      setComments([newComment, ...comments]);
      toast.success(t.taskDetail.commentAdded);

      // Refresh activity logs after adding a comment
      const actRes = await fetch(
        `/api/activity?targetId=${encodeURIComponent(task.id)}&targetType=task`,
      );
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivityLogs(actData as ActivityItem[]);
      }
    } catch {
      setCommentText(tempText);
      toast.error(t.taskDetail.commentAddFailed || "Failed to add comment");
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(t.taskDetail.taskDeleted);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["phases"] });
      // Clear selectedTask to prevent stale references and 404 errors
      setSelectedTask(null);
    } catch {
      toast.error(t.taskDetail.taskDeleteFailed || "Failed to delete task");
    }
  };

  // ─── Subtask handlers ─────────────────────────────────────────────────

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    if (!task) return;
    // Optimistic update
    if (taskDetail) {
      setTaskDetail({
        ...taskDetail,
        subtasks: taskDetail.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, completed: !completed } : s,
        ),
      });
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Refresh activity logs
      const actRes = await fetch(
        `/api/activity?targetId=${encodeURIComponent(task.id)}&targetType=task`,
      );
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivityLogs(actData as ActivityItem[]);
      }
    } catch {
      // Rollback on failure
      if (taskDetail) {
        setTaskDetail({
          ...taskDetail,
          subtasks: taskDetail.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, completed } : s,
          ),
        });
      }
      toast.error("Failed to update subtasks");
    }
  };

  const handleAddSubtask = async () => {
    if (!task) return;
    const trimmed = newSubtaskText.trim();
    if (!trimmed || isAddingSubtask) return;

    setIsAddingSubtask(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const newSubtask = await res.json();

      // Optimistic update
      if (taskDetail) {
        setTaskDetail({
          ...taskDetail,
          subtasks: [
            ...taskDetail.subtasks,
            { id: newSubtask.id, title: newSubtask.title, completed: false },
          ],
        });
      }
      setNewSubtaskText("");

      // Refresh activity logs
      const actRes = await fetch(
        `/api/activity?targetId=${encodeURIComponent(task.id)}&targetType=task`,
      );
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivityLogs(actData as ActivityItem[]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add subtasks");
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!task) return;
    // Optimistic update
    if (taskDetail) {
      setTaskDetail({
        ...taskDetail,
        subtasks: taskDetail.subtasks.filter((s) => s.id !== subtaskId),
      });
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks/${subtaskId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Refresh activity logs
      const actRes = await fetch(
        `/api/activity?targetId=${encodeURIComponent(task.id)}&targetType=task`,
      );
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivityLogs(actData as ActivityItem[]);
      }
    } catch {
      // Rollback - refetch or restore
      toast.error("Failed to delete subtasks");
      // Re-fetch task detail to restore correct state
      try {
        const res = await fetch(`/api/tasks/${task.id}`);
        if (res.ok && mountedRef.current) {
          const data = await res.json();
          setTaskDetail(data as TaskDetailResponse);
        }
      } catch {
        // Silently ignore rollback fetch errors
      }
    }
  };

  const handleStartEditSubtask = (subtaskId: string, title: string) => {
    setEditingSubtaskId(subtaskId);
    setEditingSubtaskTitle(title);
  };

  const handleSaveEditSubtask = async (subtaskId: string) => {
    if (!task) return;
    const trimmed = editingSubtaskTitle.trim();
    if (!trimmed) return;

    // Optimistic update
    if (taskDetail) {
      setTaskDetail({
        ...taskDetail,
        subtasks: taskDetail.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, title: trimmed } : s,
        ),
      });
    }

    setEditingSubtaskId(null);
    setEditingSubtaskTitle("");

    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      toast.error("Failed to update subtasks");
    }
  };

  const handleCancelEditSubtask = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskTitle("");
  };

  // ─── Render ────────────────────────────────────────────────────────────

  if (!task) return null;

  return (
    <Sheet
      open={taskDetailOpen}
      onOpenChange={(open) => {
        if (!open) setSelectedTask(null);
      }}
    >
      <SheetContent className="w-full sm:max-w-[480px] p-0 gap-0 overflow-y-auto [&>button]:hidden">
        {/* Always render a SheetTitle for screen reader accessibility */}
        <SheetTitle className="sr-only">
          {task.title || "Task details"}
        </SheetTitle>
        {/* Show content immediately using selectedTask data, enriched with API data when available */}
        <>
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Priority Badge - Prominent */}
                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                  <Badge
                    className={cn(
                      "text-xs px-2.5 py-1 gap-1.5 font-semibold border-0",
                      priority.solidBg,
                    )}
                  >
                    {priority.icon}
                    {priority.label}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0.5 cursor-pointer hover:bg-muted/50 transition-colors",
                          status.bg,
                          status.color,
                        )}
                      >
                        {status.icon}
                        <span className="ml-1">{statusLabel}</span>
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      {[...columns]
                        .sort((a, b) => a.order - b.order)
                        .map((col) => {
                          const cfg = statusConfig[col.slug];
                          if (!cfg) return null;
                          return (
                            <DropdownMenuItem
                              key={col.slug}
                              onClick={() => handleStatusChange(col.slug)}
                              className={cn(
                                "gap-2",
                                task.status === col.slug && "bg-muted",
                              )}
                            >
                              <span className={cfg.color}>{cfg.icon}</span>
                              <span className="text-sm">{col.name}</span>
                              {task.status === col.slug && (
                                <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-emerald-500" />
                              )}
                            </DropdownMenuItem>
                          );
                        })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <SheetTitle className="text-lg leading-tight">
                  {task.title}
                </SheetTitle>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => {
                        if (!taskDetail) return;
                        useAppStore
                          .getState()
                          .setEditingTask(taskDetail as Task);
                        useAppStore.getState().setSelectedTask(null);
                        useAppStore.getState().setCreateTaskDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="text-sm">{t.common.edit}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      className="gap-2"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="text-sm">{t.common.delete}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSelectedTask(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t.taskDetail.description}
              </h4>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {task.description}
              </p>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t.taskDetail.assignee}
                </h4>
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[9px] bg-muted">
                      {getUserInitials(
                        users,
                        taskDetail?.assignee?.id || task.assigneeId,
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {taskDetail?.assignee?.name ||
                      getUserName(users, task.assigneeId)}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t.taskDetail.project}
                </h4>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: taskDetail?.projectRel
                        ? (taskDetail.projectRel as Project).color
                        : getProjectColor(projects, task.projectId),
                    }}
                  />
                  <span className="text-sm">
                    {taskDetail?.projectRel
                      ? (taskDetail.projectRel as Project).name
                      : getProjectName(projects, task.projectId)}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t.taskDetail.dueDate}
                </h4>
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t.taskDetail.created}
                </h4>
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {task.createdAt
                    ? new Date(task.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </div>
              </div>
              {/* Phase */}
              <div className="col-span-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Phase
                </h4>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-2 text-sm px-2.5 py-1.5 rounded-md border transition-colors",
                        "hover:bg-muted/50 cursor-pointer",
                        task.phaseId
                          ? "border-[oklch(0.55_0.15_160/0.3)] bg-[oklch(0.55_0.15_160/0.05)]"
                          : "border-muted-foreground/20 bg-transparent",
                      )}
                    >
                      <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                      <span
                        className={cn(
                          task.phaseId
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {currentPhaseName}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52">
                    <DropdownMenuItem
                      onClick={() => handlePhaseChange("")}
                      className={cn("gap-2", !task.phaseId && "bg-muted")}
                    >
                      <span className="text-muted-foreground">—</span>
                      <span className="text-sm">Aucune phase</span>
                      {!task.phaseId && (
                        <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-emerald-500" />
                      )}
                    </DropdownMenuItem>
                    {projectPhases.length > 0 && <DropdownMenuSeparator />}
                    {projectPhases.map((phase) => (
                      <DropdownMenuItem
                        key={phase.id}
                        onClick={() => handlePhaseChange(phase.id)}
                        className={cn(
                          "gap-2",
                          task.phaseId === phase.id && "bg-muted",
                        )}
                      >
                        <GitBranch className="h-3.5 w-3.5 text-[oklch(0.55_0.15_160)]" />
                        <span className="text-sm">{phase.name}</span>
                        {task.phaseId === phase.id && (
                          <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-emerald-500" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    {projectPhases.length === 0 && (
                      <div className="px-2 py-3 text-xs text-center text-muted-foreground">
                        Aucune phase disponible pour ce projet
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Separator />

            {/* Tags */}
            {Array.isArray(task.tags) && task.tags.length > 0 && (
              <>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {t.taskDetail.tags}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {task.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs px-2.5 py-0.5"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Subtasks with animated progress bar */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.taskDetail.subtasks}
                  {subtaskTotal > 0 && (
                    <span>
                      {" "}
                      ({subtaskDone}/{subtaskTotal})
                    </span>
                  )}
                </h4>
                {subtaskTotal > 0 && (
                  <span className="text-xs font-medium">{subtaskPercent}%</span>
                )}
              </div>

              {/* Animated Progress Bar - only when there are subtasks */}
              {subtaskTotal > 0 && (
                <div className="h-2 bg-muted rounded-full mb-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${subtaskPercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      subtaskPercent === 100
                        ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                        : subtaskPercent >= 50
                          ? "bg-gradient-to-r from-cyan-400 to-teal-500"
                          : "bg-gradient-to-r from-amber-400 to-amber-500",
                    )}
                  />
                </div>
              )}

              {/* Subtask list */}
              <div className="space-y-1.5 mb-3">
                {task.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <Checkbox
                      checked={subtask.completed}
                      onCheckedChange={() =>
                        handleToggleSubtask(subtask.id, subtask.completed)
                      }
                      className="h-4 w-4 shrink-0"
                    />

                    {/* Inline editing or display */}
                    {editingSubtaskId === subtask.id ? (
                      <div className="flex-1 flex items-center gap-1.5">
                        <Input
                          value={editingSubtaskTitle}
                          onChange={(e) =>
                            setEditingSubtaskTitle(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveEditSubtask(subtask.id);
                            } else if (e.key === "Escape") {
                              handleCancelEditSubtask();
                            }
                          }}
                          className="h-7 text-sm flex-1"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleSaveEditSubtask(subtask.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={handleCancelEditSubtask}
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span
                          className={cn(
                            "text-sm flex-1 cursor-pointer truncate",
                            subtask.completed &&
                              "line-through text-muted-foreground",
                          )}
                          onClick={() =>
                            handleStartEditSubtask(subtask.id, subtask.title)
                          }
                          title="Click to edit"
                        >
                          {subtask.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                          title="Delete subtasks"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new subtask input */}
              <div className="flex items-center gap-2">
                <Input
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Add a subtask..."
                  className="h-9 text-sm"
                  disabled={isAddingSubtask}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskText.trim() || isAddingSubtask}
                  className="h-9 px-3 shrink-0"
                >
                  {isAddingSubtask ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>
            </div>
            <Separator />

            {/* Activity Log */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t.taskDetail.activityLog}
              </h4>
              {isLoadingActivity ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Loading activity...
                  </span>
                </div>
              ) : activityLogs.length > 0 ? (
                <div className="relative pl-5">
                  {/* Timeline line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-3">
                    {activityLogs.map((entry) => (
                      <div
                        key={entry.id}
                        className="relative flex items-start gap-3"
                      >
                        <div className="absolute left-[-13px] top-1.5 w-3 h-3 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            {getActivityIcon(entry.type)}
                            <span className="text-xs">
                              {getUserName(users, entry.userId)}{" "}
                              {entry.description}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatRelativeTime(entry.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60 py-2">
                  No activity recorded yet for this task.
                </p>
              )}
            </div>

            <Separator />

            {/* Comments */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />{" "}
                {t.taskDetail.comments}{" "}
                {comments.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/50 font-normal">
                    ({comments.length})
                  </span>
                )}
              </h4>

              {/* Comment input */}
              <div className="flex items-start gap-2 mb-4">
                <Avatar className="h-7 w-7 mt-0.5">
                  <AvatarFallback className="text-[9px] bg-teal-500 text-white">
                    {currentUser
                      ? currentUser.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                      : getUserInitials(
                          users,
                          users.length > 0 ? users[0].id : undefined,
                        )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                  <Input
                    placeholder={t.taskDetail.addComment}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="h-9 pr-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-teal-500 hover:text-teal-600"
                    disabled={!commentText.trim()}
                    onClick={handleAddComment}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Comments list */}
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {comments.map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start gap-2.5"
                    >
                      <Avatar className="h-7 w-7 mt-0.5">
                        <AvatarFallback className="text-[9px] bg-muted">
                          {getUserInitials(users, comment.userId)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold">
                            {comment.user?.name ||
                              getUserName(users, comment.userId)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80">
                          {comment.content}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground/60 py-2">
                    No comments yet. Be the first to comment!
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      </SheetContent>
    </Sheet>
  );
}
