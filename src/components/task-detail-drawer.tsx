"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
} from "@/lib/types";
import { mockProjects, mockUsers } from "@/lib/mock-data";
import { useApiData } from "@/hooks/use-api-data";
import { cn } from "@/lib/utils";
import { buildStatusConfig, DEFAULT_COLUMNS, ICON_MAP } from "@/lib/column-utils";
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
  const { taskDetailOpen, setTaskDetailOpen, selectedTask, updateTaskStatus, columns, currentUser } =
    useAppStore();
  const { t } = useTranslation();
  const [commentText, setCommentText] = useState("");
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [taskDetail, setTaskDetail] = useState<TaskDetailResponse | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityItem[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // ─── API Data ──────────────────────────────────────────────────────────
  const { data: projectsData } = useApiData("/api/projects", {
    fallback: mockProjects,
  });
  const { data: usersData } = useApiData("/api/users", {
    fallback: mockUsers,
  });
  const projects = (projectsData as Project[]) || mockProjects;
  const users = (usersData as User[]) || mockUsers;

  // ─── Fetch full task detail when drawer opens ──────────────────────────
  const taskId = selectedTask ? (selectedTask as unknown as Task).id : null;

  useEffect(() => {
    if (!taskDetailOpen || !taskId) {
      setTaskDetail(null);
      setComments([]);
      setActivityLogs([]);
      return;
    }

    let cancelled = false;

    async function fetchTaskDetail() {
      setIsLoadingDetail(true);
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setTaskDetail(data as TaskDetailResponse);
          setComments(data.comments || []);
        }
      } catch {
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
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setActivityLogs(data as ActivityItem[]);
      } catch {
        if (!cancelled) setActivityLogs([]);
      } finally {
        if (!cancelled) setIsLoadingActivity(false);
      }
    }

    fetchTaskDetail();
    fetchActivityLogs();

    return () => {
      cancelled = true;
    };
  }, [taskDetailOpen, taskId, selectedTask]);

  const statusConfig = useMemo(
    () => buildStatusConfig(columns.length > 0 ? columns : DEFAULT_COLUMNS),
    [columns],
  );

  if (!selectedTask) return null;

  const task = taskDetail ? taskDetail : (selectedTask as unknown as Task);
  const status = statusConfig[task.status];
  const statusLabel = columns.find((c) => c.slug === task.status)?.name || task.status;
  const priority = priorityConfig[task.priority];
  const subtaskDone = task.subtasks.filter((s) => s.completed).length;
  const subtaskTotal = task.subtasks.length;
  const subtaskPercent =
    subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;

  const handleStatusChange = async (newStatus: string) => {
    const oldLabel = columns.find((c) => c.slug === task.status)?.name || task.status;
    const newLabel = columns.find((c) => c.slug === newStatus)?.name || newStatus;
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

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

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
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(t.taskDetail.taskDeleted);
      setTaskDetailOpen(false);
    } catch {
      toast.error(t.taskDetail.taskDeleteFailed || "Failed to delete task");
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Sheet open={taskDetailOpen} onOpenChange={setTaskDetailOpen}>
      <SheetContent className="w-full sm:max-w-[480px] p-0 gap-0 overflow-y-auto [&>button]:hidden">
        {/* Always render a SheetTitle for screen reader accessibility */}
        <SheetTitle className="sr-only">
          {task.title || "Task details"}
        </SheetTitle>
        {isLoadingDetail && !taskDetail ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
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
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        className="gap-2"
                        onClick={() => toast.info(t.taskDetail.editMode)}
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
                    onClick={() => setTaskDetailOpen(false)}
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
                        {getUserInitials(users, taskDetail?.assignee?.id || task.assigneeId)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {taskDetail?.assignee?.name || getUserName(users, task.assigneeId)}
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
              </div>

              <Separator />

              {/* Tags */}
              {task.tags.length > 0 && (
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
              {subtaskTotal > 0 && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t.taskDetail.subtasks} ({subtaskDone}/{subtaskTotal})
                      </h4>
                      <span className="text-xs font-medium">{subtaskPercent}%</span>
                    </div>
                    {/* Animated Progress Bar */}
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
                    <div className="space-y-2">
                      {task.subtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={subtask.completed}
                            className="h-4 w-4"
                          />
                          <span
                            className={cn(
                              "text-sm",
                              subtask.completed &&
                                "line-through text-muted-foreground",
                            )}
                          >
                            {subtask.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Activity Log */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {t.taskDetail.activityLog}
                </h4>
                {isLoadingActivity ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Loading activity...</span>
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
                  <MessageSquare className="h-3.5 w-3.5" /> {t.taskDetail.comments}{" "}
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
        )}
      </SheetContent>
    </Sheet>
  );
}
