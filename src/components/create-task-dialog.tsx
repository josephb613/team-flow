'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
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
import { toast } from 'sonner';
import { mockProjects, mockUsers } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const priorityOptions = [
  { value: 'urgent', labelKey: 'urgent' as const, color: 'text-rose-600 bg-rose-500/10' },
  { value: 'high', labelKey: 'high' as const, color: 'text-amber-600 bg-amber-500/10' },
  { value: 'medium', labelKey: 'medium' as const, color: 'text-cyan-600 bg-cyan-500/10' },
  { value: 'low', labelKey: 'low' as const, color: 'text-emerald-600 bg-emerald-500/10' },
];

export function CreateTaskDialog() {
  const { createTaskDialogOpen, setCreateTaskDialogOpen } = useAppStore();
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setProjectId('');
    setAssigneeId('');
    setDueDate('');
    setTags('');
  };

  const handleOpenChange = (open: boolean) => {
    setCreateTaskDialogOpen(open);
    if (!open) resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would call the API
    console.log('Creating task:', {
      title,
      description,
      priority,
      projectId,
      assigneeId,
      dueDate,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    });
    toast.success(t.toast.taskCreated);
    setCreateTaskDialogOpen(false);
    resetForm();
  };

  return (
    <Dialog open={createTaskDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">{t.createTask.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-sm font-medium">
              {t.createTask.taskTitle} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              placeholder={t.createTask.taskTitlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-desc" className="text-sm font-medium">
              {t.createTask.description}
            </Label>
            <Textarea
              id="task-desc"
              placeholder={t.createTask.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Priority & Project row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t.createTask.priority}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', opt.color.split(' ')[1])} />
                        {t.tasks[opt.labelKey]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t.createTask.project}</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t.createTask.selectProject} />
                </SelectTrigger>
                <SelectContent>
                  {mockProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee & Due Date row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t.createTask.assignee}</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t.createTask.unassigned} />
                </SelectTrigger>
                <SelectContent>
                  {mockUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t.createTask.dueDate}</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="task-tags" className="text-sm font-medium">
              {t.createTask.tags}
            </Label>
            <Input
              id="task-tags"
              placeholder={t.createTask.tagsPlaceholder}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t.createTask.cancel}
            </Button>
            <Button
              type="submit"
              className="bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white"
              disabled={!title.trim()}
            >
              {t.createTask.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
