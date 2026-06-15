'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { useAppData } from '@/hooks/use-app-data';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  CircleDot,
  FileText,
  Flag,
  FolderKanban,
  Tag,
  Type,
  UserCircle,
  X,
} from 'lucide-react';
import type { Task } from '@/lib/types';

const TITLE_MAX_LENGTH = 120;

const statusOptions = [
  { value: 'todo', labelKey: 'todo' as const, color: 'bg-slate-400' },
  { value: 'in_progress', labelKey: 'inProgress' as const, color: 'bg-amber-500' },
  { value: 'review', labelKey: 'inReview' as const, color: 'bg-cyan-500' },
  { value: 'done', labelKey: 'done' as const, color: 'bg-blue-500' },
];

const priorityOptions = [
  { value: 'urgent', labelKey: 'urgent' as const, color: 'bg-rose-500', border: 'border-l-rose-500' },
  { value: 'high', labelKey: 'high' as const, color: 'bg-amber-500', border: 'border-l-amber-500' },
  { value: 'medium', labelKey: 'medium' as const, color: 'bg-cyan-500', border: 'border-l-cyan-500' },
  { value: 'low', labelKey: 'low' as const, color: 'bg-blue-500', border: 'border-l-blue-500' },
];

function parseDueDate(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function EditTaskDialog() {
  const { editTaskId, closeEditTaskDialog, selectedTask, setSelectedTask } = useAppStore();
  const { tasks, projects, users, refetch } = useAppData();
  const { t } = useTranslation();
  const ct = t.createTask;
  const et = t.editTask;

  const task = tasks.find((item) => item.id === editTaskId) ?? null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [projectError, setProjectError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedPriority = priorityOptions.find((p) => p.value === priority);
  const selectedStatus = statusOptions.find((p) => p.value === status);
  const selectedProject = projects.find((p) => p.id === projectId);
  const selectedAssignee = users.find((u) => u.id === assigneeId);

  const populateForm = useCallback((source: Task) => {
    setTitle(source.title);
    setDescription(source.description ?? '');
    setStatus(source.status);
    setPriority(
      priorityOptions.some((option) => option.value === source.priority) ? source.priority : 'medium'
    );
    setProjectId(source.projectId);
    setAssigneeId(source.assigneeId || '');
    setDueDate(parseDueDate(source.dueDate));
    setTags(source.tags ?? []);
    setTagInput('');
    setTitleError('');
    setProjectError('');
  }, []);

  useEffect(() => {
    if (task) populateForm(task);
  }, [task, populateForm]);

  const handleOpenChange = (open: boolean) => {
    if (!open) closeEditTaskDialog();
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 8) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((item) => item !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const validate = (): boolean => {
    let valid = true;
    if (!title.trim()) {
      setTitleError(ct.titleRequired);
      valid = false;
    } else {
      setTitleError('');
    }
    if (!projectId) {
      setProjectError(ct.projectRequired);
      valid = false;
    } else {
      setProjectError('');
    }
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !editTaskId || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${editTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          projectId,
          assigneeId: assigneeId || null,
          tags,
          dueDate: dueDate?.toISOString() ?? null,
        }),
      });

      if (!res.ok) {
        throw new Error('update_failed');
      }

      const updated = (await res.json()) as {
        id: string;
        title: string;
        description: string | null;
        status: string;
        priority: string;
        projectId: string;
        assigneeId: string | null;
        dueDate: string | null;
        tags: string;
        updatedAt: string;
        subtasks?: { id: string; title: string; completed: boolean }[];
      };

      await refetch();

      if (selectedTask && (selectedTask as unknown as Task).id === editTaskId) {
        const current = selectedTask as unknown as Task;
        setSelectedTask({
          ...current,
          title: updated.title,
          description: updated.description ?? '',
          status: updated.status as Task['status'],
          priority: updated.priority as Task['priority'],
          projectId: updated.projectId,
          assigneeId: updated.assigneeId ?? '',
          dueDate: updated.dueDate ? new Date(updated.dueDate).toISOString().split('T')[0] : '',
          tags: updated.tags ? updated.tags.split(',').filter(Boolean) : [],
          subtasks: updated.subtasks ?? current.subtasks,
          updatedAt: updated.updatedAt,
        } as unknown as Record<string, unknown>);
      }

      toast.success(t.toast.taskUpdated);
      closeEditTaskDialog();
    } catch {
      toast.error(et.error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!editTaskId) return null;

  return (
    <Dialog open={Boolean(editTaskId)} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[min(640px,85vh)] p-0 gap-0 overflow-hidden flex flex-col">
        <div className="relative px-6 pt-6 pb-4 shrink-0 bg-gradient-to-r from-[oklch(0.55_0.18_250/0.08)] via-[oklch(0.55_0.18_250/0.04)] to-transparent border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.15_250)] text-white shadow-sm">
                <CheckSquare className="h-4 w-4" />
              </div>
              <span className="bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.45_0.15_250)] bg-clip-text text-transparent font-bold">
                {et.title}
              </span>
            </DialogTitle>
          </DialogHeader>
        </div>

        {!task ? (
          <div className="px-6 py-4 text-sm text-muted-foreground">{et.notFound}</div>
        ) : (
          <div
            className={cn(
              'border-l-[3px] transition-colors duration-300 flex flex-col min-h-0 flex-1',
              selectedPriority?.border || 'border-l-cyan-500'
            )}
          >
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                <div className="space-y-2">
                  <Label htmlFor="edit-task-title" className="text-sm font-medium flex items-center gap-1.5">
                    <Type className="h-3.5 w-3.5 text-muted-foreground" />
                    {ct.taskTitle} <span className="text-destructive text-xs">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="edit-task-title"
                      placeholder={ct.taskTitlePlaceholder}
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value.slice(0, TITLE_MAX_LENGTH));
                        if (titleError) setTitleError('');
                      }}
                      className={cn(
                        'h-10 pr-16',
                        titleError
                          ? 'border-destructive focus-visible:ring-destructive/30'
                          : 'focus-visible:ring-[oklch(0.55_0.18_250/0.3)]'
                      )}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums">
                      {title.length}/{TITLE_MAX_LENGTH}
                    </span>
                  </div>
                  {titleError && <p className="text-xs text-destructive">{titleError}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-task-desc" className="text-sm font-medium flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    {ct.description}
                  </Label>
                  <Textarea
                    id="edit-task-desc"
                    placeholder={ct.descriptionPlaceholder}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px] resize-none focus-visible:ring-[oklch(0.55_0.18_250/0.3)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                      {ct.status}
                    </Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {selectedStatus ? (
                            <span className="flex items-center gap-2">
                              <span className={cn('w-2 h-2 rounded-full', selectedStatus.color)} />
                              {(t.tasks as Record<string, string>)?.[selectedStatus.labelKey] || selectedStatus.value}
                            </span>
                          ) : ct.status}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              <span className={cn('w-2 h-2 rounded-full', opt.color)} />
                              {(t.tasks as Record<string, string>)?.[opt.labelKey] || opt.value}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                      {ct.priority}
                    </Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {selectedPriority ? (
                            <span className="flex items-center gap-2">
                              <span className={cn('w-2 h-2 rounded-full', selectedPriority.color)} />
                              {(t.tasks as Record<string, string>)?.[selectedPriority.labelKey] || selectedPriority.value}
                            </span>
                          ) : ct.priority}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              <span className={cn('w-2 h-2 rounded-full', opt.color)} />
                              {(t.tasks as Record<string, string>)?.[opt.labelKey] || opt.value}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                      {ct.project}
                    </Label>
                    <Select
                      value={projectId}
                      onValueChange={(value) => {
                        setProjectId(value);
                        if (projectError) setProjectError('');
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={ct.selectProject}>
                          {selectedProject ? (
                            <span className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: selectedProject.color }}
                              />
                              <span className="truncate">{selectedProject.name}</span>
                            </span>
                          ) : ct.selectProject}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: project.color }}
                              />
                              <span className="truncate">{project.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {projectError && <p className="text-xs text-destructive">{projectError}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      {ct.assignee}
                    </Label>
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={ct.unassigned}>
                          {selectedAssignee ? (
                            <span className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.15_250)] text-white text-[10px] font-medium shrink-0">
                                {selectedAssignee.name.split(' ').map((n) => n[0]).join('')}
                              </span>
                              <span className="truncate">{selectedAssignee.name}</span>
                            </span>
                          ) : ct.unassigned}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <span className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.15_250)] text-white text-[10px] font-medium shrink-0">
                                {user.name.split(' ').map((n) => n[0]).join('')}
                              </span>
                              <span className="truncate">{user.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    {ct.dueDate}
                  </Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'h-10 w-full justify-start text-left font-normal',
                          !dueDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {dueDate
                          ? dueDate.toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : ct.selectDate}
                        <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={(date: Date | undefined) => {
                          setDueDate(date);
                          setCalendarOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-task-tags" className="text-sm font-medium flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    {ct.tags}
                  </Label>
                  <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-3 py-2 text-sm focus-within:ring-[oklch(0.55_0.18_250/0.3)] focus-within:border-[oklch(0.55_0.18_250/0.5)] min-h-[40px]">
                    <AnimatePresence>
                      {tags.map((tag) => (
                        <motion.span
                          key={tag}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.55_0.18_250/0.1)] text-[oklch(0.55_0.18_250)] px-2.5 py-0.5 text-xs font-medium"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-destructive transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                    <input
                      id="edit-task-tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder={tags.length === 0 ? ct.tagsPlaceholder : ''}
                      className="flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-muted-foreground/60 text-sm"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t shrink-0 sm:justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => closeEditTaskDialog()}>
                  {ct.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={!title.trim() || submitting}
                  className="bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.15_250)] hover:from-[oklch(0.50_0.15_160)] hover:to-[oklch(0.44_0.12_160)] text-white"
                >
                  {submitting ? et.saving : et.save}
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
