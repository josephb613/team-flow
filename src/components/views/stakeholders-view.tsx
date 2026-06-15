'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useApiData, useProjects, apiSend } from '@/hooks/use-pmp-data';
import { useAppStore } from '@/lib/store';
import { appendWorkspaceQuery } from '@/lib/workspace-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  OrganizationLogoPicker,
  uploadStakeholderLogo,
  ACCEPTED_LOGO_TYPES,
  MAX_LOGO_SIZE,
} from '@/components/organization-logo-picker';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Handshake, Plus, Trash2, Loader2, Pencil, ExternalLink, CircleHelp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PmpViewShell } from '@/components/pmp/pmp-view-shell';

interface ApiStakeholder {
  id: string;
  name: string;
  organization: string | null;
  role: string | null;
  email: string | null;
  website: string | null;
  logo: string | null;
  influence: number;
  interest: number;
  engagement: string;
  strategy: string | null;
  projectId: string;
  project?: { id: string; name: string; icon: string };
}

const emptyForm = {
  name: '',
  organization: '',
  role: '',
  email: '',
  website: '',
  influence: 3,
  interest: 3,
  engagement: 'neutral',
  strategy: '',
};

function normalizeWebsiteUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function stakeholderInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

// Power/interest quadrant per PMBOK stakeholder analysis
function quadrant(influence: number, interest: number): 'manageClosely' | 'keepSatisfied' | 'keepInformed' | 'monitor' {
  const highInfluence = influence >= 3.5;
  const highInterest = interest >= 3.5;
  if (highInfluence && highInterest) return 'manageClosely';
  if (highInfluence) return 'keepSatisfied';
  if (highInterest) return 'keepInformed';
  return 'monitor';
}

const quadrantColors: Record<string, string> = {
  manageClosely: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
  keepSatisfied: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  keepInformed: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  monitor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
};

export function StakeholdersView() {
  const { t } = useTranslation();
  const p = t.pmp;
  const cw = t.createWorkspace;
  const activeOrganizationId = useAppStore((s) => s.activeOrganizationId);
  const { data: projects } = useProjects(activeOrganizationId);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const url = useMemo(() => {
    const base =
      projectFilter === 'all'
        ? '/api/stakeholders'
        : `/api/stakeholders?projectId=${projectFilter}`;
    return activeOrganizationId ? appendWorkspaceQuery(base, activeOrganizationId) : null;
  }, [projectFilter, activeOrganizationId]);
  const { data: stakeholders, loading, refetch } = useApiData<ApiStakeholder[]>(url);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<ApiStakeholder | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formProjectId, setFormProjectId] = useState('');
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const logoPreviewRef = useRef<string | null>(null);

  const engagementLabels: Record<string, string> = {
    unaware: p.engUnaware, resistant: p.engResistant, neutral: p.engNeutral,
    supportive: p.engSupportive, leading: p.engLeading,
  };
  const quadrantLabels: Record<string, string> = {
    manageClosely: p.manageClosely, keepSatisfied: p.keepSatisfied,
    keepInformed: p.keepInformed, monitor: p.monitor,
  };
  const quadrantTooltips = p.quadrantTooltips;

  const resetLogoState = () => {
    setLogoFile(null);
    setLogoRemoved(false);
    if (logoPreviewRef.current) {
      URL.revokeObjectURL(logoPreviewRef.current);
      logoPreviewRef.current = null;
    }
    setLogoPreview(null);
  };

  const openCreateDialog = () => {
    setEditingStakeholder(null);
    setForm({ ...emptyForm });
    setFormProjectId('');
    resetLogoState();
    setDialogOpen(true);
  };

  const openEditDialog = (stakeholder: ApiStakeholder) => {
    setEditingStakeholder(stakeholder);
    setForm({
      name: stakeholder.name,
      organization: stakeholder.organization ?? '',
      role: stakeholder.role ?? '',
      email: stakeholder.email ?? '',
      website: stakeholder.website ?? '',
      influence: stakeholder.influence,
      interest: stakeholder.interest,
      engagement: stakeholder.engagement,
      strategy: stakeholder.strategy ?? '',
    });
    setFormProjectId(stakeholder.projectId);
    resetLogoState();
    setDialogOpen(true);
  };

  const handleLogoSelect = (file: File) => {
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast.error(cw.photoInvalidType);
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast.error(cw.photoTooLarge);
      return;
    }
    if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current);
    const preview = URL.createObjectURL(file);
    logoPreviewRef.current = preview;
    setLogoPreview(preview);
    setLogoFile(file);
    setLogoRemoved(false);
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoRemoved(true);
    if (logoPreviewRef.current) {
      URL.revokeObjectURL(logoPreviewRef.current);
      logoPreviewRef.current = null;
    }
    setLogoPreview(null);
  };

  const resolveLogoUrl = async (): Promise<string | null | undefined> => {
    if (logoFile) {
      const result = await uploadStakeholderLogo(logoFile);
      if (result.error === 'invalid_type') {
        toast.error(cw.photoInvalidType);
        return undefined;
      }
      if (result.error === 'too_large') {
        toast.error(cw.photoTooLarge);
        return undefined;
      }
      if (!result.url) {
        toast.error(cw.error);
        return undefined;
      }
      return result.url;
    }
    if (logoRemoved) return null;
    return undefined;
  };

  const handleSave = async () => {
    if (!form.name || !formProjectId) {
      toast.error(`${p.nameLabel} + ${p.project} requis`);
      return;
    }
    setSaving(true);
    try {
      const logo = await resolveLogoUrl();
      if (logo === undefined && logoFile) {
        setSaving(false);
        return;
      }

      const payload = {
        ...form,
        website: form.website.trim() || null,
        projectId: formProjectId,
        ...(logo !== undefined ? { logo } : {}),
      };

      if (editingStakeholder) {
        const { ok, data } = await apiSend(`/api/stakeholders/${editingStakeholder.id}`, 'PATCH', payload);
        if (ok) {
          toast.success(p.save + ' ✓');
          setDialogOpen(false);
          resetLogoState();
          refetch();
        } else {
          const errMsg = (data as { error?: string })?.error;
          toast.error(errMsg ?? 'Erreur lors de la mise à jour');
        }
      } else {
        const { ok, data } = await apiSend('/api/stakeholders', 'POST', payload);
        if (ok) {
          toast.success(p.stakeholdersTitle + ' ✓');
          setDialogOpen(false);
          setForm({ ...emptyForm });
          resetLogoState();
          refetch();
        } else {
          const errMsg = (data as { error?: string })?.error;
          toast.error(errMsg ?? 'Erreur lors de la création');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEngagementChange = async (stakeholder: ApiStakeholder, engagement: string) => {
    const { ok } = await apiSend(`/api/stakeholders/${stakeholder.id}`, 'PATCH', { engagement });
    if (ok) refetch();
  };

  const handleDelete = async (stakeholder: ApiStakeholder) => {
    const { ok } = await apiSend(`/api/stakeholders/${stakeholder.id}`, 'DELETE');
    if (ok) {
      toast.success(p.delete + ' ✓');
      refetch();
    }
  };

  const list = stakeholders ?? [];
  const dialogLogoUrl = logoPreview ?? (logoRemoved ? null : editingStakeholder?.logo ?? null);
  const dialogDisplayName = form.name || editingStakeholder?.name || p.logoLabel;

  return (
    <PmpViewShell
      pageId="stakeholders"
      icon={<Handshake className="h-6 w-6 text-cyan-500" />}
      title={p.stakeholdersTitle}
      description={p.stakeholdersDesc}
      actions={
        <>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={p.selectProject} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{p.allProjects}</SelectItem>
              {(projects ?? []).map((proj) => (
                <SelectItem key={proj.id} value={proj.id}>{proj.icon} {proj.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="h-4 w-4 mr-1" /> {p.addStakeholder}
          </Button>
        </>
      }
    >
      {/* Power / Interest matrix (quadrants) */}
      <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-2 gap-3">
        {(['keepSatisfied', 'manageClosely', 'monitor', 'keepInformed'] as const).map((quad) => {
          const members = list.filter((s) => quadrant(s.influence, s.interest) === quad);
          return (
            <Card key={quad} className={cn('border', quadrantColors[quad])}>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <span>{quadrantLabels[quad]} ({members.length})</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex shrink-0 rounded-full opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={quadrantTooltips[quad]}
                      >
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] text-left">
                      <p className="text-xs leading-relaxed normal-case tracking-normal">{quadrantTooltips[quad]}</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="flex flex-wrap gap-1.5">
                  {members.length === 0 ? (
                    <span className="text-xs opacity-50">—</span>
                  ) : members.map((s) => (
                    <Badge key={s.id} variant="secondary" className="text-[11px]">{s.name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      </TooltipProvider>

      {/* Register */}
      {loading ? (
        <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {p.loading}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">{p.noData}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((s) => {
            const quad = quadrant(s.influence, s.interest);
            const websiteUrl = s.website ? normalizeWebsiteUrl(s.website) : null;
            return (
              <Card key={s.id}>
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    {s.logo && <AvatarImage src={s.logo} alt={s.name} className="object-cover" />}
                    <AvatarFallback className="text-xs font-semibold">
                      {stakeholderInitials(s.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{s.name}</span>
                      {s.role && <span className="text-xs text-muted-foreground">{s.role}</span>}
                      {s.organization && <Badge variant="outline" className="text-[10px]">{s.organization}</Badge>}
                      <Badge className={cn('text-[10px] border', quadrantColors[quad])} variant="outline">
                        {quadrantLabels[quad]}
                      </Badge>
                      {s.project && <span className="text-xs text-muted-foreground">{s.project.icon} {s.project.name}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                      <span>{p.influence}: {s.influence}/5</span>
                      <span>{p.interest}: {s.interest}/5</span>
                      {s.email && <span>{s.email}</span>}
                      {websiteUrl && (
                        <a
                          href={websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {s.website}
                        </a>
                      )}
                    </div>
                    {s.strategy && (
                      <p className="text-xs mt-1"><span className="text-muted-foreground">{p.strategyLabel}:</span> {s.strategy}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={s.engagement} onValueChange={(v) => handleEngagementChange(s, v)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(engagementLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500" onClick={() => handleDelete(s)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStakeholder ? p.editStakeholder : p.addStakeholder}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{p.project}</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger><SelectValue placeholder={p.selectProject} /></SelectTrigger>
                <SelectContent>
                  {(projects ?? []).map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>{proj.icon} {proj.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <OrganizationLogoPicker
              logoUrl={dialogLogoUrl}
              icon={stakeholderInitials(dialogDisplayName) || '🤝'}
              color="#06b6d4"
              name={dialogDisplayName}
              photoLabel={p.logoLabel}
              photoHint={cw.photoHint}
              photoAdd={cw.photoAdd}
              photoChange={cw.photoChange}
              photoRemove={cw.photoRemove}
              onSelect={handleLogoSelect}
              onRemove={handleLogoRemove}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{p.nameLabel}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">{p.roleLabel}</Label>
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">{p.organizationLabel}</Label>
                <Input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">{p.emailLabel}</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{p.websiteLabel}</Label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">{p.influence} (1-5)</Label>
                <Select value={String(form.influence)} onValueChange={(v) => setForm({ ...form, influence: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{p.interest} (1-5)</Label>
                <Select value={String(form.interest)} onValueChange={(v) => setForm({ ...form, interest: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">{p.engagementLabel}</Label>
              <Select value={form.engagement} onValueChange={(v) => setForm({ ...form, engagement: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(engagementLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{p.strategyLabel}</Label>
              <Textarea rows={2} value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{p.cancel}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingStakeholder ? p.save : p.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PmpViewShell>
  );
}
