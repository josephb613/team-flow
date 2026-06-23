'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types';
import { useAppData } from '@/hooks/use-app-data';
import { appendWorkspaceQuery } from '@/lib/workspace-query';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  todo: { label: 'To Do', color: 'text-slate-500', icon: <Circle className="h-4 w-4" />, bg: 'bg-slate-500/10' },
  in_progress: { label: 'In Progress', color: 'text-cyan-500', icon: <Clock className="h-4 w-4" />, bg: 'bg-cyan-500/10' },
  review: { label: 'In Review', color: 'text-amber-500', icon: <AlertCircle className="h-4 w-4" />, bg: 'bg-amber-500/10' },
  done: { label: 'Done', color: 'text-blue-500', icon: <CheckCircle2 className="h-4 w-4" />, bg: 'bg-blue-500/10' },
};

const priorityConfig: Record<TaskPriority, { label: string; color: string; bg: string; icon: React.ReactNode; solidBg: string }> = {
  urgent: { label: 'Urgent', color: 'text-rose-600', bg: 'bg-rose-500/10 border-rose-200', icon: <Flame className="h-3.5 w-3.5" />, solidBg: 'bg-rose-500 text-white' },
  high: { label: 'High', color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-200', icon: <ArrowUp className="h-3.5 w-3.5" />, solidBg: 'bg-amber-500 text-white' },
  medium: { label: 'Medium', color: 'text-cyan-600', bg: 'bg-cyan-500/10 border-cyan-200', icon: <ArrowRight className="h-3.5 w-3.5" />, solidBg: 'bg-cyan-500 text-white' },
  low: { label: 'Low', color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-200', icon: <ArrowDown className="h-3.5 w-3.5" />, solidBg: 'bg-blue-500 text-white' },
};

interface TaskComment {
  id: string;
  userId: string;
  text: string;
  time: string;
}

interface ActivityLogEntry {
  id: string;
  icon: React.ReactNode;
  text: string;
  time: string;
}

export function TaskDetailDrawer() {
  const {
    taskDetailOpen,
    setTaskDetailOpen,
    selectedTask,
    currentUser,
    activeOrganizationId,
    openEditTaskDialog,
    setSelectedTask,
  } = useAppStore();
  const { tasks, projects, getUserName, getUserInitials, getProjectName, updateTaskStatus, updateTaskPriority } = useAppData();
  const { t } = useTranslation();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activityLog] = useState<ActivityLogEntry[]>([]);

  const getProjectColor = (id: string) => projects.find((p) => p.id === id)?.color || '#3b82f6';

  const selectedId = selectedTask ? (selectedTask as unknown as Task).id : null;

  useEffect(() => {
    if (!taskDetailOpen || !selectedId || !activeOrganizationId) {
      setComments([]);
      return;
    }

    const url = appendWorkspaceQuery(`/api/tasks/${selectedId}/comments`, activeOrganizationId);
    fetch(url)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { id: string; userId: string; content: string; createdAt: string }[]) => {
        setComments(
          data.map((c) => ({
            id: c.id,
            userId: c.userId,
            text: c.content,
            time: new Date(c.createdAt).toLocaleString(),
          }))
        );
      })
      .catch(() => setComments([]));
  }, [taskDetailOpen, selectedId, activeOrganizationId]);

  if (!selectedTask) return null;

  const task = tasks.find((item) => item.id === selectedId) ?? (selectedTask as unknown as Task);
  const status = statusConfig[task.status];
  const priority = priorityConfig[task.priority];
  const projectColor = getProjectColor(task.projectId);
  const pl: Record<TaskPriority, string> = {
    urgent: t.tasks.urgent,
    high: t.tasks.high,
    medium: t.tasks.medium,
    low: t.tasks.low,
  };
  const subtaskDone = task.subtasks.filter((s) => s.completed).length;
  const subtaskTotal = task.subtasks.length;
  const subtaskPercent = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (newStatus === 'done') {
      void updateTaskStatus(task.id, newStatus);
      return;
    }
    const oldLabel = statusConfig[task.status].label;
    const newLabel = statusConfig[newStatus].label;
    void updateTaskStatus(task.id, newStatus);
    setSelectedTask({ ...task, status: newStatus } as unknown as Record<string, unknown>);
    toast.success(t.taskDetail.statusChanged.replace('{from}', oldLabel).replace('{to}', newLabel));
  };

  const handlePriorityChange = (newPriority: TaskPriority) => {
    const oldLabel = pl[task.priority];
    const newLabel = pl[newPriority];
    void updateTaskPriority(task.id, newPriority);
    setSelectedTask({ ...task, priority: newPriority } as unknown as Record<string, unknown>);
    toast.success(t.taskDetail.priorityChanged.replace('{from}', oldLabel).replace('{to}', newLabel));
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedId || !currentUser?.id || !activeOrganizationId) return;

    try {
      const url = appendWorkspaceQuery(`/api/tasks/${selectedId}/comments`, activeOrganizationId);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim(), userId: currentUser.id }),
      });
      if (!res.ok) throw new Error('comment_failed');
      const created = (await res.json()) as { id: string; userId: string; content: string; createdAt: string };
      const newComment: TaskComment = {
        id: created.id,
        userId: created.userId,
        text: created.content,
        time: t.activity.justNow,
      };
      setComments([newComment, ...comments]);
      setCommentText('');
      toast.success(t.taskDetail.commentAdded);
    } catch {
      toast.error(t.editTask.error);
    }
  };

  const handleDelete = () => {
    toast.success(t.taskDetail.taskDeleted);
    setTaskDetailOpen(false);
  };

  return (
    <Sheet open={taskDetailOpen} onOpenChange={setTaskDetailOpen}>
      <SheetContent showCloseButton={false} className="w-full sm:max-w-[480px] p-0 gap-0 overflow-y-auto">
        {/* Header */}
        <SheetHeader className="gap-3 border-b p-0 px-6 pt-5 pb-4">
          {/* Toolbar: metadata + actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Badge className={cn('text-xs px-2.5 py-1 gap-1.5 font-semibold border-0 cursor-pointer hover:opacity-90 transition-opacity', priority.solidBg)}>
                    {priority.icon}
                    {pl[task.priority]}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {(Object.keys(priorityConfig) as TaskPriority[]).map((key) => {
                    const cfg = priorityConfig[key];
                    return (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => handlePriorityChange(key)}
                        className={cn('gap-2', task.priority === key && 'bg-muted')}
                      >
                        <span className={cfg.color}>{cfg.icon}</span>
                        <span className="text-sm">{pl[key]}</span>
                        {task.priority === key && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-blue-500" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] px-2 py-0.5 cursor-pointer hover:bg-muted/50 transition-colors', status.bg, status.color)}
                  >
                    {status.icon}
                    <span className="ml-1">{status.label}</span>
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {(Object.keys(statusConfig) as TaskStatus[]).map((key) => {
                    const cfg = statusConfig[key];
                    return (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => handleStatusChange(key)}
                        className={cn('gap-2', task.status === key && 'bg-muted')}
                      >
                        <span className={cfg.color}>{cfg.icon}</span>
                        <span className="text-sm">{cfg.label}</span>
                        {task.status === key && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-blue-500" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-muted/50 hover:bg-muted">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem className="gap-2" onClick={() => openEditTaskDialog(task.id)}>
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="text-sm">{t.common.edit}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" className="gap-2" onClick={handleDelete}>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="text-sm">{t.common.delete}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTaskDetailOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Title — full width, visually highlighted */}
          <div className="relative overflow-hidden rounded-lg bg-muted/40 px-4 py-3">
            <div
              className="absolute inset-y-0 left-0 w-1 rounded-l-lg"
              style={{ backgroundColor: projectColor }}
            />
            <SheetTitle className="pl-2 text-lg font-bold leading-snug tracking-tight">
              {task.title}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.taskDetail.description}</h4>
            <p className="text-sm text-foreground/80 leading-relaxed">{task.description}</p>
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.taskDetail.assignee}</h4>
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[9px] bg-muted">{getUserInitials(task.assigneeId)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{getUserName(task.assigneeId)}</span>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.taskDetail.project}</h4>
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getProjectColor(task.projectId) }}
                />
                <span className="text-sm">{getProjectName(task.projectId)}</span>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.taskDetail.priority}</h4>
              <Badge variant="outline" className={cn('text-xs px-2 py-0.5 gap-1', priority.bg, priority.color)}>
                {priority.icon}
                {pl[task.priority]}
              </Badge>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.taskDetail.dueDate}</h4>
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {new Date(task.dueDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.taskDetail.created}</h4>
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {new Date(task.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>

          <Separator />

          {/* Tags */}
          {task.tags.length > 0 && (
            <>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.taskDetail.tags}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs px-2.5 py-0.5">
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
                    transition={{ duration: 0.8, ease: 'easeOut' as const }}
                    className={cn(
                      'h-full rounded-full',
                      subtaskPercent === 100
                        ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                        : subtaskPercent >= 50
                          ? 'bg-gradient-to-r from-cyan-400 to-blue-500'
                          : 'bg-gradient-to-r from-amber-400 to-amber-500'
                    )}
                  />
                </div>
                <div className="space-y-2">
                  {task.subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox checked={subtask.completed} className="h-4 w-4" />
                      <span className={cn('text-sm', subtask.completed && 'line-through text-muted-foreground')}>
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
            <div className="relative pl-5">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-3">
                {activityLog.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">{t.pmp.noData}</p>
                ) : (
                  activityLog.map((entry) => (
                    <div key={entry.id} className="relative flex items-start gap-3">
                      <div className="absolute left-[-13px] top-1.5 w-3 h-3 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          {entry.icon}
                          <span className="text-xs">{entry.text}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/60">{entry.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Comments */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> {t.taskDetail.comments}
            </h4>

            {/* Comment input */}
            <div className="flex items-start gap-2 mb-4">
              <Avatar className="h-7 w-7 mt-0.5">
                <AvatarFallback className="text-[9px] bg-blue-500 text-white">
                  {currentUser ? getUserInitials(currentUser.id) : '??'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <Input
                  placeholder={t.taskDetail.addComment}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="h-9 pr-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-blue-500 hover:text-blue-600"
                  disabled={!commentText.trim()}
                  onClick={handleAddComment}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Comments list */}
            <div className="space-y-3">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-2">{t.pmp.noData}</p>
              )}
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
                      <AvatarFallback className="text-[9px] bg-muted">{getUserInitials(comment.userId)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold">{getUserName(comment.userId)}</span>
                        <span className="text-[10px] text-muted-foreground">{comment.time}</span>
                      </div>
                      <p className="text-sm text-foreground/80">{comment.text}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
