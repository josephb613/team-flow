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

export function CreateSprintDialog() {
  const { createSprintDialogOpen, setCreateSprintDialogOpen, activeOrganizationId, activeProjectId } =
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

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'planning' | 'active' | 'completed'>('planning');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setGoal('');
    setProjectId(defaultProjectId);
    setStartDate('');
    setEndDate('');
    setStatus('planning');
  };

  const handleOpenChange = (open: boolean) => {
    setCreateSprintDialogOpen(open);
    if (open) {
      setProjectId(defaultProjectId);
    } else {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !projectId || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          goal: goal.trim() || null,
          projectId,
          startDate: startDate || null,
          endDate: endDate || null,
          status,
        }),
      });

      if (!res.ok) {
        throw new Error('create_failed');
      }

      await refetch();
      toast.success(t.toast.sprintCreated);
      handleOpenChange(false);
    } catch {
      toast.error(t.createSprint.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={createSprintDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">{t.createSprint.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="sprint-name" className="text-sm font-medium">
              {t.createSprint.name} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sprint-name"
              placeholder={t.createSprint.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sprint-goal" className="text-sm font-medium">
              {t.sprints.goal}
            </Label>
            <Textarea
              id="sprint-goal"
              placeholder={t.createSprint.goalPlaceholder}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t.milestones.project} <span className="text-destructive">*</span>
            </Label>
            <Select value={projectId} onValueChange={setProjectId} required>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={t.createSprint.selectProject} />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sprint-start" className="text-sm font-medium">
                {t.sprints.startDate}
              </Label>
              <Input
                id="sprint-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sprint-end" className="text-sm font-medium">
                {t.sprints.endDate}
              </Label>
              <Input
                id="sprint-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10"
                min={startDate || undefined}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.sprints.status}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">{t.sprints.planning}</SelectItem>
                <SelectItem value="active">{t.sprints.active}</SelectItem>
                <SelectItem value="completed">{t.sprints.completed}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t.createSprint.cancel}
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.48_0.15_160)] hover:from-[oklch(0.48_0.15_160)] hover:to-[oklch(0.42_0.15_160)] text-white"
              disabled={!name.trim() || !projectId || submitting}
            >
              {submitting ? t.createSprint.creating : t.createSprint.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
