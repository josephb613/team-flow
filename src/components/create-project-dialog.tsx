'use client';

import { useState } from 'react';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const colorOptions = [
  '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#10b981',
];

const iconOptions = ['🌐', '📱', '⚡', '📢', '📊', '🔒', '🎨', '🚀', '📋', '🏠'];

export function CreateProjectDialog() {
  const { createProjectDialogOpen, setCreateProjectDialogOpen, activeOrganizationId } = useAppStore();
  const { refetch } = useAppData();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [icon, setIcon] = useState('📋');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor('#3b82f6');
    setIcon('📋');
  };

  const handleOpenChange = (open: boolean) => {
    setCreateProjectDialogOpen(open);
    if (!open) resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || submitting) return;

    if (!activeOrganizationId) {
      toast.error(t.createProject.error);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
          color,
          icon,
          workspaceId: activeOrganizationId,
        }),
      });

      if (!res.ok) {
        throw new Error('create_failed');
      }

      await refetch();
      toast.success(t.toast.projectCreated);
      handleOpenChange(false);
    } catch {
      toast.error(t.createProject.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={createProjectDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">{t.createProject.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-sm font-medium">
              {t.createProject.projectTitle} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              placeholder={t.createProject.projectTitlePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-desc" className="text-sm font-medium">
              {t.createProject.description}
            </Label>
            <Textarea
              id="project-desc"
              placeholder={t.createProject.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.createProject.icon}</Label>
            <div className="flex flex-wrap gap-2">
              {iconOptions.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all border-2',
                    icon === i
                      ? 'border-[oklch(0.55_0.18_250)] bg-[oklch(0.55_0.18_250/0.1)] scale-110'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.createProject.color}</Label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all border-2',
                    color === c
                      ? 'border-foreground scale-110 shadow-md'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-xl border bg-muted/30">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ backgroundColor: color + '20', color }}
              >
                {icon}
              </div>
              <div>
                <p className="text-sm font-medium">{name || t.createProject.projectTitlePlaceholder}</p>
                <p className="text-xs text-muted-foreground">{description || t.createProject.descriptionPlaceholder}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t.createProject.cancel}
            </Button>
            <Button
              type="submit"
              className="bg-[oklch(0.55_0.18_250)] hover:bg-[oklch(0.48_0.18_250)] text-white"
              disabled={!name.trim() || submitting}
            >
              {submitting ? t.createProject.creating : t.createProject.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
