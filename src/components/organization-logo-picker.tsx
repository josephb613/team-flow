'use client';

import { useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrganizationLogo } from '@/components/organization-logo';

export const ACCEPTED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_LOGO_SIZE = 2 * 1024 * 1024;

type OrganizationLogoPickerProps = {
  logoUrl?: string | null;
  icon: string;
  color: string;
  name: string;
  photoLabel: string;
  photoHint: string;
  photoAdd: string;
  photoChange: string;
  photoRemove: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
  className?: string;
};

export function OrganizationLogoPicker({
  logoUrl,
  icon,
  color,
  name,
  photoLabel,
  photoHint,
  photoAdd,
  photoChange,
  photoRemove,
  onSelect,
  onRemove,
  className,
}: OrganizationLogoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasLogo = Boolean(logoUrl);

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_LOGO_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onSelect(file);
            e.target.value = '';
          }
        }}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative group w-16 h-16 rounded-2xl overflow-hidden shrink-0 transition-all',
          hasLogo
            ? 'ring-2 ring-[oklch(0.55_0.18_250/0.25)] shadow-sm'
            : 'border-2 border-dashed border-muted-foreground/25 hover:border-[oklch(0.55_0.18_250/0.4)] hover:bg-muted/40'
        )}
      >
        {hasLogo ? (
          <>
            <OrganizationLogo
              logo={logoUrl}
              icon={icon}
              color={color}
              name={name}
              className="w-full h-full rounded-2xl"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-4 w-4 text-white" />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Camera className="h-5 w-5" />
          </div>
        )}
      </button>

      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{photoLabel}</p>
        <p className="text-xs text-muted-foreground">{photoHint}</p>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-[oklch(0.55_0.18_250)] hover:opacity-80 font-medium"
          >
            {hasLogo ? photoChange : photoAdd}
          </button>
          {hasLogo && (
            <button
              type="button"
              onClick={() => {
                onRemove();
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              {photoRemove}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export async function uploadWorkspaceLogo(file: File): Promise<{ url?: string; error?: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/workspaces/logo', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { error: data.error ?? 'upload_failed' };
  }

  const { url } = (await res.json()) as { url: string };
  return { url };
}

export async function uploadStakeholderLogo(file: File): Promise<{ url?: string; error?: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/stakeholders/logo', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { error: data.error ?? 'upload_failed' };
  }

  const { url } = (await res.json()) as { url: string };
  return { url };
}
