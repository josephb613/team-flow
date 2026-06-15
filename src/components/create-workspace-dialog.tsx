'use client';

import { useRef, useState } from 'react';
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
import { OrganizationLogo } from '@/components/organization-logo';
import { Building2, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn, slugify } from '@/lib/utils';

const colorOptions = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316',
];

const iconOptions = ['🏢', '🌐', '🚀', '⚡', '📊', '🎨', '🔒', '📋', '🏠', '💼'];

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024;

export function CreateWorkspaceDialog() {
  const { t } = useTranslation();
  const { refetch } = useAppData();
  const open = useAppStore((s) => s.createWorkspaceDialogOpen);
  const setOpen = useAppStore((s) => s.setCreateWorkspaceDialogOpen);
  const currentUser = useAppStore((s) => s.currentUser);
  const setActiveOrganization = useAppStore((s) => s.setActiveOrganization);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#10b981');
  const [icon, setIcon] = useState('🏢');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor('#10b981');
    setIcon('🏢');
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleLogoSelect = (file: File | null) => {
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t.createWorkspace.photoInvalidType);
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      toast.error(t.createWorkspace.photoTooLarge);
      return;
    }

    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/workspaces/logo', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (data.error === 'invalid_type') {
        toast.error(t.createWorkspace.photoInvalidType);
      } else if (data.error === 'too_large') {
        toast.error(t.createWorkspace.photoTooLarge);
      }
      return null;
    }

    const { url } = (await res.json()) as { url: string };
    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || submitting) return;

    setSubmitting(true);
    try {
      let logoUrl: string | null = null;

      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
        if (!logoUrl) {
          setSubmitting(false);
          return;
        }
      }

      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          slug: slugify(trimmedName),
          description: description.trim() || null,
          color,
          icon,
          logo: logoUrl,
          userId: currentUser?.id,
        }),
      });

      if (!res.ok) {
        throw new Error('create_failed');
      }

      const workspace = (await res.json()) as { id: string };

      await refetch();
      setActiveOrganization(workspace.id);
      toast.success(t.toast.workspaceCreated);
      handleOpenChange(false);
    } catch {
      toast.error(t.createWorkspace.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-emerald-600" />
            {t.createWorkspace.title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex flex-col items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={(e) => handleLogoSelect(e.target.files?.[0] ?? null)}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative group w-20 h-20 rounded-2xl overflow-hidden transition-all',
                logoPreview
                  ? 'ring-2 ring-emerald-500/30 shadow-sm'
                  : 'border-2 border-dashed border-muted-foreground/25 hover:border-emerald-500/40 hover:bg-muted/40'
              )}
            >
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                  <Camera className="h-5 w-5" />
                </div>
              )}
            </button>

            <div className="text-center space-y-1">
              <p className="text-sm font-medium">{t.createWorkspace.photo}</p>
              <p className="text-xs text-muted-foreground">{t.createWorkspace.photoHint}</p>
              {logoPreview ? (
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    {t.createWorkspace.photoChange}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    {t.createWorkspace.photoRemove}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium pt-1"
                >
                  {t.createWorkspace.photoAdd}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-name" className="text-sm font-medium">
              {t.createWorkspace.name} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="org-name"
              placeholder={t.createWorkspace.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-desc" className="text-sm font-medium">
              {t.createWorkspace.description}
            </Label>
            <Textarea
              id="org-desc"
              placeholder={t.createWorkspace.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.createWorkspace.icon}</Label>
            <div className="flex flex-wrap gap-2">
              {iconOptions.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all border-2',
                    icon === i
                      ? 'border-emerald-500 bg-emerald-500/10 scale-110'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.createWorkspace.color}</Label>
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

          <div className="p-3 rounded-xl border bg-muted/30">
            <div className="flex items-center gap-3">
              <OrganizationLogo
                logo={logoPreview}
                icon={icon}
                color={color}
                name={name.trim() || t.createWorkspace.namePlaceholder}
                className="w-10 h-10 rounded-lg text-lg"
              />
              <div>
                <p className="text-sm font-medium">
                  {name.trim() || t.createWorkspace.namePlaceholder}
                </p>
                <p className="text-xs text-muted-foreground">
                  {description.trim() || t.createWorkspace.descriptionPlaceholder}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t.createWorkspace.cancel}
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || submitting}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white"
            >
              {submitting ? '...' : t.createWorkspace.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
