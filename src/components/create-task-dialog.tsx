'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useAppData } from '@/hooks/use-app-data';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Type,
  FileText,
  CircleDot,
  Flag,
  FolderKanban,
  UserCircle,
  CalendarDays,
  Tag,
  ListChecks,
  Plus,
  X,
  ChevronDown,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';

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

interface Subtask {
  id: string;
  title: string;
}

export function CreateTaskDialog() {
  const {
    createTaskDialogOpen,
    setCreateTaskDialogOpen,
    createTaskDefaults,
    activeProjectId,
    currentUser,
  } = useAppStore();
  const { projects, users, refetch } = useAppData();
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [projectError, setProjectError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedPriority = priorityOptions.find((p) => p.value === priority);
  const selectedStatus = statusOptions.find((p) => p.value === status);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setStatus('todo');
    setPriority('medium');
    setProjectId('');
    setAssigneeId('');
    setDueDate(undefined);
    setTagInput('');
    setTags([]);
    setSubtasks([]);
    setNewSubtask('');
    setTitleError('');
    setProjectError('');
  }, []);

  const applyDefaults = useCallback(() => {
    setStatus(createTaskDefaults?.status ?? 'todo');
    setProjectId(createTaskDefaults?.projectId ?? activeProjectId ?? projects[0]?.id ?? '');
  }, [createTaskDefaults, activeProjectId, projects]);

  useEffect(() => {
    if (createTaskDialogOpen) {
      applyDefaults();
    }
  }, [createTaskDialogOpen, applyDefaults]);

  const handleOpenChange = (open: boolean) => {
    setCreateTaskDialogOpen(open);
    if (!open) resetForm();
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 8) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addSubtask = () => {
    const trimmed = newSubtask.trim();
    if (trimmed && subtasks.length < 10) {
      setSubtasks([...subtasks, { id: `st-${Date.now()}`, title: trimmed }]);
      setNewSubtask('');
    }
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handleSubtaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtask();
    }
  };

  const validate = (): boolean => {
    let valid = true;
    if (!title.trim()) {
      setTitleError(t.createTask.titleRequired);
      valid = false;
    } else {
      setTitleError('');
    }
    if (!projectId) {
      setProjectError(t.createTask.projectRequired);
      valid = false;
    } else {
      setProjectError('');
    }
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          projectId,
          assigneeId: assigneeId || null,
          creatorId: currentUser?.id ?? null,
          tags,
          dueDate: dueDate?.toISOString() ?? null,
          subtasks: subtasks.map((s) => ({ title: s.title })),
        }),
      });

      if (!res.ok) {
        throw new Error('create_failed');
      }

      await refetch();
      toast.success(t.toast.taskCreated);
      setCreateTaskDialogOpen(false);
      resetForm();
    } catch {
      toast.error(t.createTask.error);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === projectId);
  const selectedAssignee = users.find((u) => u.id === assigneeId);

  return (
    <Dialog open={createTaskDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[520px] max-h-[min(640px,85vh)] p-0 gap-0 overflow-hidden flex flex-col"
        showCloseButton={false}
      >
        <motion.div
          className="flex flex-col min-h-0 flex-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {/* Gradient Header */}
          <div className="relative px-6 pt-6 pb-4 shrink-0 bg-gradient-to-r from-[oklch(0.55_0.18_250/0.08)] via-[oklch(0.55_0.18_250/0.04)] to-transparent border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.15_250)] text-white shadow-sm">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <span className="bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.45_0.15_250)] bg-clip-text text-transparent font-bold">
                  {t.createTask.title}
                </span>
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t.createTask.title}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Form Content with Priority Border */}
          <div
            className={cn(
              'border-l-[3px] transition-colors duration-300 flex flex-col min-h-0 flex-1',
              selectedPriority?.border || 'border-l-cyan-500'
            )}
          >
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {/* Task Title */}
              <div className="space-y-2">
                <Label htmlFor="task-title" className="text-sm font-medium flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-muted-foreground" />
                  {t.createTask.taskTitle} <span className="text-destructive text-xs">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="task-title"
                    placeholder={t.createTask.taskTitlePlaceholder}
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
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums">
                    {title.length}/{TITLE_MAX_LENGTH}
                  </span>
                </div>
                <AnimatePresence>
                  {titleError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-destructive"
                    >
                      {titleError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="task-desc" className="text-sm font-medium flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  {t.createTask.description}
                  <span className="text-[10px] text-muted-foreground/60 ml-1">({t.createTask.markdownHint})</span>
                </Label>
                <Textarea
                  id="task-desc"
                  placeholder={t.createTask.descriptionPlaceholder}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px] resize-none focus-visible:ring-[oklch(0.55_0.18_250/0.3)]"
                />
              </div>

              {/* Status & Priority row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                    {t.createTask.status} <span className="text-destructive text-xs">*</span>
                  </Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-10 focus:ring-[oklch(0.55_0.18_250/0.3)]">
                      <SelectValue>
                        {selectedStatus ? (
                          <span className="flex items-center gap-2">
                            <span className={cn('w-2 h-2 rounded-full', selectedStatus.color)} />
                            {(t.tasks as Record<string, string>)?.[selectedStatus.labelKey] || selectedStatus.value}
                          </span>
                        ) : t.createTask.status}
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
                    {t.createTask.priority}
                  </Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-10 focus:ring-[oklch(0.55_0.18_250/0.3)]">
                      <SelectValue>
                        {selectedPriority ? (
                          <span className="flex items-center gap-2">
                            <span className={cn('w-2 h-2 rounded-full', selectedPriority.color)} />
                            {(t.tasks as Record<string, string>)?.[selectedPriority.labelKey] || selectedPriority.value}
                          </span>
                        ) : t.createTask.priority}
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

              {/* Project & Assignee row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                    {t.createTask.project}
                  </Label>
                  <Select
                    value={projectId}
                    onValueChange={(value) => {
                      setProjectId(value);
                      if (projectError) setProjectError('');
                    }}
                  >
                    <SelectTrigger className="h-10 focus:ring-[oklch(0.55_0.18_250/0.3)]">
                      <SelectValue placeholder={t.createTask.selectProject}>
                        {selectedProject ? (
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: selectedProject.color }}
                            />
                            <span className="truncate">{selectedProject.name}</span>
                          </span>
                        ) : t.createTask.selectProject}
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
                  {projectError && (
                    <p className="text-xs text-destructive">{projectError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    {t.createTask.assignee}
                  </Label>
                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger className="h-10 focus:ring-[oklch(0.55_0.18_250/0.3)]">
                      <SelectValue placeholder={t.createTask.unassigned}>
                        {selectedAssignee ? (
                          <span className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.15_250)] text-white text-[10px] font-medium shrink-0">
                              {selectedAssignee.name.split(' ').map((n) => n[0]).join('')}
                            </span>
                            <span className="truncate">{selectedAssignee.name}</span>
                          </span>
                        ) : t.createTask.unassigned}
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
                            <span className={cn(
                              'w-1.5 h-1.5 rounded-full ml-auto shrink-0',
                              user.status === 'online' ? 'bg-blue-500' :
                              user.status === 'away' ? 'bg-amber-500' :
                              user.status === 'busy' ? 'bg-rose-500' : 'bg-muted-foreground/40'
                            )} />
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {t.createTask.dueDate}
                </Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'h-10 w-full justify-start text-left font-normal focus:ring-[oklch(0.55_0.18_250/0.3)]',
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
                        : t.createTask.selectDate}
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
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="task-tags" className="text-sm font-medium flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  {t.createTask.tags}
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
                    id="task-tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? t.createTask.tagsPlaceholder : ''}
                    className="flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-muted-foreground/60 text-sm"
                  />
                </div>
              </div>

              {/* Subtasks */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                  {t.createTask.subtasks}
                  {subtasks.length > 0 && (
                    <span className="text-[10px] text-muted-foreground/60 ml-1">
                      ({subtasks.length})
                    </span>
                  )}
                </Label>
                <AnimatePresence>
                  {subtasks.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      {subtasks.map((subtask, index) => (
                        <motion.div
                          key={subtask.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.15, delay: index * 0.03 }}
                          className="flex items-center gap-2 group"
                        >
                          <div className="h-4 w-4 rounded border border-muted-foreground/30 shrink-0" />
                          <span className="text-sm flex-1 truncate">{subtask.title}</span>
                          <button
                            type="button"
                            onClick={() => removeSubtask(subtask.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-2">
                  <Input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={handleSubtaskKeyDown}
                    placeholder={t.createTask.subtaskPlaceholder}
                    className="h-9 text-sm focus-visible:ring-[oklch(0.55_0.18_250/0.3)]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSubtask}
                    disabled={!newSubtask.trim()}
                    className="h-9 px-3 shrink-0 hover:border-[oklch(0.55_0.18_250/0.3)] hover:text-[oklch(0.55_0.18_250)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-background shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t.createTask.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={!title.trim() || submitting}
                  className="bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.15_250)] hover:from-[oklch(0.50_0.15_160)] hover:to-[oklch(0.44_0.12_160)] text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:shadow-none"
                >
                  <CheckSquare className="h-4 w-4 mr-1.5" />
                  {submitting ? t.createTask.creating : t.createTask.create}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
