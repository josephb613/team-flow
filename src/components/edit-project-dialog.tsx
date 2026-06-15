'use client';

import { useEffect, useState } from 'react';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ProjectStatus } from '@/lib/types';

const colorOptions = [
  '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#10b981',
];

const iconOptions = ['🌐', '📱', '⚡', '📢', '📊', '🔒', '🎨', '🚀', '📋', '🏠'];

function toDateInputValue(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function EditProjectDialog() {
  const { editProjectId, closeEditProjectDialog } = useAppStore();
  const { projects, refetch } = useAppData();
  const { t } = useTranslation();
  const cp = t.createProject;
  const ep = t.editProject;

  const project = projects.find((p) => p.id === editProjectId) ?? null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [icon, setIcon] = useState('📋');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setDescription(project.description ?? '');
    setColor(project.color);
    setIcon(project.icon);
    setStatus(project.status);
    setStartDate(toDateInputValue(project.startDate));
    setEndDate(toDateInputValue(project.dueDate));
  }, [project]);

  const handleOpenChange = (open: boolean) => {
    if (!open) closeEditProjectDialog();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !editProjectId || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${editProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
          color,
          icon,
          status,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });

      if (!res.ok) {
        throw new Error('update_failed');
      }

      await refetch();
      toast.success(t.toast.projectUpdated);
      closeEditProjectDialog();
    } catch {
      toast.error(ep.error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!editProjectId) return null;

  const statusLabels: Record<ProjectStatus, string> = {
    active: t.projects.active,
    on_hold: t.projects.onHold,
    completed: t.projects.completed,
    archived: t.projects.archived,
  };

  return (
    <Dialog open={Boolean(editProjectId)} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 max-h-[min(90vh,560px)] flex flex-col overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base">{ep.title}</DialogTitle>
        </DialogHeader>

        {!project ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">{t.projectDetail.projectNotFound}</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
            <div className="overflow-y-auto px-4 py-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-project-name" className="text-xs font-medium">
                  {cp.projectTitle} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-project-name"
                  placeholder={cp.projectTitlePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-project-desc" className="text-xs font-medium">
                  {cp.description}
                </Label>
                <Textarea
                  id="edit-project-desc"
                  placeholder={cp.descriptionPlaceholder}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="min-h-0 resize-none text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{cp.status}</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(statusLabels) as ProjectStatus[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {statusLabels[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-project-start" className="text-xs font-medium">
                    {cp.startDate}
                  </Label>
                  <Input
                    id="edit-project-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-xs px-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-project-end" className="text-xs font-medium">
                    {cp.endDate}
                  </Label>
                  <Input
                    id="edit-project-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-xs px-2"
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center text-base shrink-0"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{name || cp.projectTitlePlaceholder}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {statusLabels[status]}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">{cp.icon}</Label>
                  <div className="flex flex-wrap gap-1">
                    {iconOptions.map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setIcon(i)}
                        className={cn(
                          'w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all border',
                          icon === i
                            ? 'border-[oklch(0.55_0.18_250)] bg-[oklch(0.55_0.18_250/0.1)]'
                            : 'border-transparent bg-background hover:bg-muted/80'
                        )}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">{cp.color}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {colorOptions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          'w-6 h-6 rounded-full transition-all border-2',
                          color === c ? 'border-foreground scale-105' : 'border-transparent hover:scale-105'
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="px-4 py-3 border-t shrink-0 sm:justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => closeEditProjectDialog()}>
                {cp.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[oklch(0.55_0.18_250)] hover:bg-[oklch(0.48_0.18_250)] text-white"
                disabled={!name.trim() || submitting}
              >
                {submitting ? ep.saving : ep.save}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
