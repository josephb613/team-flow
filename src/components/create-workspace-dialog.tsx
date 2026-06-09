'use client';

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
import { Building2 } from 'lucide-react';

export function CreateWorkspaceDialog() {
  const { t } = useTranslation();
  const open = useAppStore((s) => s.createWorkspaceDialogOpen);
  const setOpen = useAppStore((s) => s.setCreateWorkspaceDialogOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[oklch(0.55_0.15_160)]" />
            {t.createWorkspace.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t.createWorkspace.name}
            </label>
            <Input placeholder={t.createWorkspace.namePlaceholder} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t.createWorkspace.description}
            </label>
            <Input placeholder={t.createWorkspace.descriptionPlaceholder} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              {t.createWorkspace.cancel}
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.48_0.15_160)] text-white"
              onClick={() => setOpen(false)}
            >
              {t.createWorkspace.create}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
