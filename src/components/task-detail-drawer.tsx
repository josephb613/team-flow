'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  X,
  Calendar,
  Clock,
  MessageSquare,
  Paperclip,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
  Send,
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types';
import { mockProjects, mockUsers } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  todo: { label: 'To Do', color: 'text-slate-500', icon: <Circle className="h-4 w-4" />, bg: 'bg-slate-500/10' },
  in_progress: { label: 'In Progress', color: 'text-cyan-500', icon: <Clock className="h-4 w-4" />, bg: 'bg-cyan-500/10' },
  review: { label: 'In Review', color: 'text-amber-500', icon: <AlertCircle className="h-4 w-4" />, bg: 'bg-amber-500/10' },
  done: { label: 'Done', color: 'text-emerald-500', icon: <CheckCircle2 className="h-4 w-4" />, bg: 'bg-emerald-500/10' },
};

const priorityConfig: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent', color: 'text-rose-600', bg: 'bg-rose-500/10 border-rose-200' },
  high: { label: 'High', color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-200' },
  medium: { label: 'Medium', color: 'text-cyan-600', bg: 'bg-cyan-500/10 border-cyan-200' },
  low: { label: 'Low', color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-200' },
};

function getUserInitials(id: string) {
  const user = mockUsers.find((u) => u.id === id);
  return user ? user.name.split(' ').map((n) => n[0]).join('') : '??';
}

function getUserName(id: string) {
  return mockUsers.find((u) => u.id === id)?.name || 'Unknown';
}

function getProjectName(id: string) {
  return mockProjects.find((p) => p.id === id)?.name || 'Unknown';
}

function getProjectColor(id: string) {
  return mockProjects.find((p) => p.id === id)?.color || '#10b981';
}

export function TaskDetailDrawer() {
  const { taskDetailOpen, setTaskDetailOpen, selectedTask } = useAppStore();
  const [commentText, setCommentText] = useState('');

  if (!selectedTask) return null;

  const task = selectedTask as Task;
  const status = statusConfig[task.status];
  const priority = priorityConfig[task.priority];
  const subtaskDone = task.subtasks.filter((s) => s.completed).length;
  const subtaskTotal = task.subtasks.length;

  return (
    <Sheet open={taskDetailOpen} onOpenChange={setTaskDetailOpen}>
      <SheetContent className="w-full sm:max-w-[480px] p-0 gap-0 overflow-y-auto">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', priority.bg, priority.color)}>
                  {priority.label}
                </Badge>
                <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', status.bg, status.color)}>
                  {status.icon}
                  <span className="ml-1">{status.label}</span>
                </Badge>
              </div>
              <SheetTitle className="text-lg leading-tight">{task.title}</SheetTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setTaskDetailOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</h4>
            <p className="text-sm text-foreground/80 leading-relaxed">{task.description}</p>
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Assignee</h4>
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[9px] bg-muted">{getUserInitials(task.assigneeId)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{getUserName(task.assigneeId)}</span>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Project</h4>
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getProjectColor(task.projectId) }}
                />
                <span className="text-sm">{getProjectName(task.projectId)}</span>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Due Date</h4>
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
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Created</h4>
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
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tags</h4>
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

          {/* Subtasks */}
          {subtaskTotal > 0 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Subtasks ({subtaskDone}/{subtaskTotal})
                  </h4>
                  <span className="text-xs font-medium">{Math.round((subtaskDone / subtaskTotal) * 100)}%</span>
                </div>
                <Progress value={(subtaskDone / subtaskTotal) * 100} className="h-1.5 mb-3" />
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

          {/* Comments */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Comments
            </h4>

            {/* Comment input */}
            <div className="flex items-start gap-2 mb-4">
              <Avatar className="h-7 w-7 mt-0.5">
                <AvatarFallback className="text-[9px] bg-[oklch(0.55_0.15_160)] text-white">AT</AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <Input
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="h-9 pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  disabled={!commentText.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Sample comments */}
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Avatar className="h-7 w-7 mt-0.5">
                  <AvatarFallback className="text-[9px] bg-muted">SC</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold">Sarah Chen</span>
                    <span className="text-[10px] text-muted-foreground">2h ago</span>
                  </div>
                  <p className="text-sm text-foreground/80">Looks great! Just a few tweaks on the responsive breakpoints.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Avatar className="h-7 w-7 mt-0.5">
                  <AvatarFallback className="text-[9px] bg-muted">MR</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold">Marcus Rivera</span>
                    <span className="text-[10px] text-muted-foreground">5h ago</span>
                  </div>
                  <p className="text-sm text-foreground/80">I can help with the API integration part when you're ready.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
