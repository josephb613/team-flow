'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { useAppData } from '@/hooks/use-app-data';
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
import type { MilestoneStatus } from '@/lib/types';

export function CreateMilestoneDialog() {
  const { createMilestoneDialogOpen, setCreateMilestoneDialogOpen, activeOrganizationId, activeProjectId } =
    useAppStore();
  const { projects, refetch } = useAppData();
  const { t } = useTranslation();

  const workspaceProjects = useMemo(
    () => projects.filter((p) => p.organizationId === activeOrganizationId),
    [projects, activeOrganizationId]
  );

  const defaultProjectId =
    activeProjectId && workspaceProjects.some((p) => p.id === activeProjectId)
      ? activeProjectId
      : workspaceProjects[0]?.id ?? '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<MilestoneStatus>('upcoming');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId(defaultProjectId);
    setDueDate('');
    setStatus('upcoming');
  };

  const handleOpenChange = (open: boolean) => {
    setCreateMilestoneDialogOpen(open);
    if (open) {
      setProjectId(defaultProjectId);
    } else {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !projectId || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || null,
          projectId,
          dueDate: dueDate || null,
          status,
        }),
      });

      if (!res.ok) {
        throw new Error('create_failed');
      }

      await refetch();
      toast.success(t.toast.milestoneCreated);
      handleOpenChange(false);
    } catch {
      toast.error(t.createMilestone.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={createMilestoneDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">{t.createMilestone.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="milestone-title" className="text-sm font-medium">
              {t.createMilestone.titleLabel} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="milestone-title"
              placeholder={t.createMilestone.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-description" className="text-sm font-medium">
              {t.createMilestone.description}
            </Label>
            <Textarea
              id="milestone-description"
              placeholder={t.createMilestone.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t.milestones.project} <span className="text-destructive">*</span>
            </Label>
            <Select value={projectId} onValueChange={setProjectId} required>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={t.createMilestone.selectProject} />
              </SelectTrigger>
              <SelectContent>
                {workspaceProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-due-date" className="text-sm font-medium">
              {t.milestones.dueDate}
            </Label>
            <Input
              id="milestone-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.milestones.status}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as MilestoneStatus)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">{t.milestones.upcoming}</SelectItem>
                <SelectItem value="in_progress">{t.milestones.inProgress}</SelectItem>
                <SelectItem value="completed">{t.milestones.completed}</SelectItem>
                <SelectItem value="overdue">{t.milestones.overdue}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t.createMilestone.cancel}
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.48_0.15_160)] hover:from-[oklch(0.48_0.15_160)] hover:to-[oklch(0.42_0.15_160)] text-white"
              disabled={!title.trim() || !projectId || submitting}
            >
              {submitting ? t.createMilestone.creating : t.createMilestone.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
