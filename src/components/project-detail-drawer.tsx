"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  PauseCircle,
  Archive,
  Users,
  TrendingUp,
  Pencil,
  Trash2,
  MoreHorizontal,
  ListTodo,
  MessageSquare,
  UserPlus,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project, ProjectStatus, User, Task } from "@/lib/types";
import { mockUsers, mockTasks } from "@/lib/mock-data";
import { useApiData } from "@/hooks/use-api-data";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

// ── Status Configuration ─────────────────────────────────────────────────────

const statusConfig: Record<
  ProjectStatus,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
    solidBg: string;
    solidText: string;
  }
> = {
  active: {
    label: "Actif",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800",
    icon: <CheckCircle2 className="h-3 w-3" />,
    solidBg: "bg-emerald-100 dark:bg-emerald-900/50",
    solidText: "text-emerald-700 dark:text-emerald-300",
  },
  on_hold: {
    label: "En pause",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 border-amber-200 dark:border-amber-800",
    icon: <PauseCircle className="h-3 w-3" />,
    solidBg: "bg-amber-100 dark:bg-amber-900/50",
    solidText: "text-amber-700 dark:text-amber-300",
  },
  completed: {
    label: "Terminé",
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-500/10 border-teal-200 dark:border-teal-800",
    icon: <CheckCircle2 className="h-3 w-3" />,
    solidBg: "bg-teal-100 dark:bg-teal-900/50",
    solidText: "text-teal-700 dark:text-teal-300",
  },
  archived: {
    label: "Archivé",
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-500/10 border-slate-200 dark:border-slate-800",
    icon: <Archive className="h-3 w-3" />,
    solidBg: "bg-slate-100 dark:bg-slate-800/50",
    solidText: "text-slate-600 dark:text-slate-300",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  urgent: "text-red-600 dark:text-red-400 bg-red-500/10",
  high: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
  medium: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
  low: "text-slate-500 dark:text-slate-400 bg-slate-500/10",
};

function getUserInitials(userId: string, users: User[]) {
  const user = users.find((u) => u.id === userId);
  return user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "??";
}

function getUserName(userId: string, users: User[]) {
  return users.find((u) => u.id === userId)?.name || "Utilisateur inconnu";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "à l'instant";
    if (diffMins < 60) return `il y a ${diffMins} min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays < 7) return `il y a ${diffDays}j`;
    return formatShortDate(dateStr);
  } catch {
    return "";
  }
}

function getActivityIcon(type: string) {
  switch (type) {
    case "task_created":
    case "task_completed":
      return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
    case "comment_added":
      return <MessageSquare className="h-3 w-3 text-blue-500" />;
    case "project_updated":
      return <TrendingUp className="h-3 w-3 text-amber-500" />;
    case "member_joined":
      return <UserPlus className="h-3 w-3 text-violet-500" />;
    case "file_uploaded":
      return <FileText className="h-3 w-3 text-cyan-500" />;
    default:
      return <AlertCircle className="h-3 w-3 text-muted-foreground" />;
  }
}

// ── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  return (
    <div className="w-full bg-muted/50 rounded-full overflow-hidden h-2.5">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
        }}
      />
    </div>
  );
}

// ── Task Status Badge ────────────────────────────────────────────────────────

const taskStatusLabels: Record<string, string> = {
  todo: "À faire",
  in_progress: "En cours",
  review: "En revue",
  done: "Terminé",
};

const taskStatusColors: Record<string, string> = {
  todo: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300",
  review: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300",
  done: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300",
};

// ── Main Component ───────────────────────────────────────────────────────────

export function ProjectDetailDrawer() {
  const { projectDetailOpen, setProjectDetailOpen, selectedProject } =
    useAppStore();
  const { t } = useTranslation();

  const { data: usersData } = useApiData("/api/users", {
    fallback: mockUsers,
  });
  const users = (usersData as User[]) || mockUsers;

  // Fetch activity logs for this project
  const projectId = selectedProject?.id as string | undefined;
  const { data: activityData, refetch: refetchActivity } = useApiData(
    projectId ? `/api/activity?projectId=${projectId}` : "",
    { immediate: false },
  );

  useEffect(() => {
    if (projectDetailOpen && projectId) {
      refetchActivity();
    }
  }, [projectDetailOpen, projectId, refetchActivity]);

  if (!selectedProject) return null;

  const project = selectedProject as unknown as Project;
  const status = statusConfig[project.status] || statusConfig.active;
  const remainingTasks = project.taskCount - project.completedTasks;
  // Tâches dérivées des membres / du contexte (via le store ou calcul)
  // Comme on a les tasks dans l'API projects (via le transform),
  // on peut les récupérer depuis selectedProject qui contient maintenant
  // les données transformées
  const projectTasks = (selectedProject as Record<string, unknown>)
    .tasks as Task[] | undefined;

  const handleDelete = async () => {
    try {
      await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    } catch {
      // API call may fail in dev mode (no auth); still remove locally
    }
    useAppStore.getState().addDeletedProjectId(project.id);
    toast.success("Projet supprimé");
    setProjectDetailOpen(false);
  };

  // Group tasks by status
  const tasksByStatus: Record<string, Task[]> = {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  };
  if (projectTasks) {
    for (const task of projectTasks) {
      const statusKey = task.status || "todo";
      if (tasksByStatus[statusKey]) {
        tasksByStatus[statusKey].push(task);
      } else {
        tasksByStatus.todo.push(task);
      }
    }
  }

  const activityLogs = (activityData as Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    userId: string;
  }>) || [];

  return (
    <Sheet open={projectDetailOpen} onOpenChange={setProjectDetailOpen}>
      <SheetContent className="w-full sm:max-w-[520px] p-0 gap-0 overflow-y-auto [&>button]:hidden">
        {/* Accent strip */}
        <div
          className="h-1.5 w-full shrink-0"
          style={{
            background: `linear-gradient(90deg, ${project.color}, ${project.color}88)`,
          }}
        />

        {/* Header */}
        <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border-0",
                    status.solidBg,
                    status.solidText,
                  )}
                >
                  {status.icon}
                  {status.label}
                </span>
              </div>

              {/* Title with icon */}
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-semibold shrink-0 shadow-sm"
                  style={{
                    backgroundColor: project.color + "18",
                    color: project.color,
                  }}
                >
                  {project.icon}
                </div>
                <SheetTitle className="text-lg leading-tight">
                  {project.name}
                </SheetTitle>
              </div>
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
                    onClick={() => toast.info("Mode édition activé")}
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
                onClick={() => setProjectDetailOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* Description */}
          {project.description && (
            <>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t.taskDetail.description}
                </h4>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {project.description}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.dashboard.projectProgress}
              </h4>
              <span
                className="text-sm font-bold"
                style={{ color: project.color }}
              >
                {project.progress}%
              </span>
            </div>
            <ProgressBar value={project.progress} color={project.color} />
            <div className="flex items-center gap-4 mt-2.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>
                  {project.completedTasks}/{project.taskCount}{" "}
                  {t.tasks.title.toLowerCase()}
                </span>
              </div>
              {remainingTasks > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span>{remainingTasks} restantes</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t.tasks.dueDate}
              </h4>
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {project.dueDate ? (
                  <span>{formatDate(project.dueDate)}</span>
                ) : (
                  <span className="text-muted-foreground/50 italic">
                    Aucune date définie
                  </span>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t.taskDetail.created}
              </h4>
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {project.createdAt ? (
                  <span>{formatDate(project.createdAt)}</span>
                ) : (
                  <span className="text-muted-foreground/50 italic">Inconnue</span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Team Members */}
          {project.members && project.members.length > 0 ? (
            <>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {t.projects.team} ({project.members.length})
                </h4>
                <div className="space-y-2">
                  {project.members.map((memberId: string) => {
                    const memberName = getUserName(memberId, users);
                    return (
                      <div
                        key={memberId}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[9px] bg-muted font-semibold">
                            {getUserInitials(memberId, users)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {memberName}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Separator />
            </>
          ) : (
            <>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {t.projects.team}
                </h4>
                <p className="text-xs text-muted-foreground/60 italic">
                  Aucun membre assigné à ce projet
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Tasks List */}
          {projectTasks && projectTasks.length > 0 && (
            <>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <ListTodo className="h-3.5 w-3.5" /> Tâches ({projectTasks.length})
                </h4>

                {/* Par statut */}
                {(["todo", "in_progress", "review", "done"] as const).map(
                  (statusKey) => {
                    const tasks = tasksByStatus[statusKey] || [];
                    if (tasks.length === 0) return null;
                    return (
                      <div key={statusKey} className="mb-3">
                        <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          {taskStatusLabels[statusKey] || statusKey} ({tasks.length})
                        </h5>
                        <div className="space-y-1.5">
                          {tasks.map((task) => {
                            const assigneeName = task.assigneeId
                              ? getUserName(task.assigneeId, users)
                              : null;
                            return (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                              >
                                {/* Subtask progress */}
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                    task.status === "done"
                                      ? "bg-emerald-500"
                                      : task.status === "in_progress"
                                        ? "bg-blue-500"
                                        : task.status === "review"
                                          ? "bg-amber-500"
                                          : "bg-slate-300 dark:bg-slate-600",
                                  )}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {task.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {task.priority && (
                                      <span
                                        className={cn(
                                          "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                                          priorityColors[task.priority] ||
                                            priorityColors.medium,
                                        )}
                                      >
                                        {task.priority}
                                      </span>
                                    )}
                                    {task.dueDate && (
                                      <span className="text-[9px] text-muted-foreground">
                                        {formatShortDate(task.dueDate)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {/* Assignee avatar */}
                                {task.assigneeId && (
                                  <TooltipProvider delayDuration={150}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Avatar className="h-5 w-5 shrink-0">
                                          <AvatarFallback className="text-[7px] bg-muted font-semibold">
                                            {getUserInitials(
                                              task.assigneeId,
                                              users,
                                            )}
                                          </AvatarFallback>
                                        </Avatar>
                                      </TooltipTrigger>
                                      <TooltipContent side="left">
                                        <p className="text-xs">
                                          {getUserName(task.assigneeId, users)}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Activity Log */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t.taskDetail.activityLog}
            </h4>
            {activityLogs.length > 0 ? (
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
                        {getActivityIcon(entry.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {entry.description}
                        </p>
                        <span className="text-[10px] text-muted-foreground/60">
                          {timeAgo(entry.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">Aucune activité récente</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
