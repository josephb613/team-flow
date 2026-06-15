'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useApiData, useProjects, useUsers, apiSend, formatMoney } from '@/hooks/use-pmp-data';
import { useAppStore } from '@/lib/store';
import { appendWorkspaceQuery } from '@/lib/workspace-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FileDiff, Plus, Trash2, Loader2, Check, X, CalendarClock, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PmpViewShell } from '@/components/pmp/pmp-view-shell';

interface ApiChangeRequest {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  impactScope: string | null;
  impactDays: number;
  impactCost: number;
  decision: string | null;
  decidedAt: string | null;
  createdAt: string;
  requestedBy?: { id: string; name: string } | null;
  project?: { id: string; name: string; icon: string; currency?: string };
}

const emptyForm = {
  title: '',
  description: '',
  priority: 'medium',
  impactScope: '',
  impactDays: '0',
  impactCost: '0',
  requestedById: '',
};

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  rejected: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  implemented: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
};

const priorityStyles: Record<string, string> = {
  urgent: 'bg-rose-500/10 text-rose-600',
  high: 'bg-orange-500/10 text-orange-600',
  medium: 'bg-amber-500/10 text-amber-600',
  low: 'bg-slate-500/10 text-slate-600',
};

export function ChangeRequestsView() {
  const { t } = useTranslation();
  const p = t.pmp;
  const activeOrganizationId = useAppStore((s) => s.activeOrganizationId);
  const { data: projects } = useProjects(activeOrganizationId);
  const { data: users } = useUsers(activeOrganizationId);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const url = useMemo(() => {
    const base =
      projectFilter === 'all'
        ? '/api/change-requests'
        : `/api/change-requests?projectId=${projectFilter}`;
    return activeOrganizationId ? appendWorkspaceQuery(base, activeOrganizationId) : null;
  }, [projectFilter, activeOrganizationId]);
  const { data: changeRequests, loading, refetch } = useApiData<ApiChangeRequest[]>(url);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [formProjectId, setFormProjectId] = useState('');
  const [saving, setSaving] = useState(false);

  const statusLabels: Record<string, string> = {
    pending: p.crPending, approved: p.crApproved, rejected: p.crRejected, implemented: p.crImplemented,
  };

  const handleCreate = async () => {
    if (!form.title || !formProjectId) {
      toast.error(`${p.riskTitleLabel} + ${p.project} requis`);
      return;
    }
    setSaving(true);
    const { ok } = await apiSend('/api/change-requests', 'POST', {
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      impactScope: form.impactScope || null,
      impactDays: Number(form.impactDays) || 0,
      impactCost: Number(form.impactCost) || 0,
      requestedById: form.requestedById || null,
      projectId: formProjectId,
    });
    setSaving(false);
    if (ok) {
      toast.success(p.changeRequestsTitle + ' ✓');
      setDialogOpen(false);
      setForm({ ...emptyForm });
      refetch();
    } else {
      toast.error('Erreur lors de la création');
    }
  };

  const handleDecision = async (cr: ApiChangeRequest, status: 'approved' | 'rejected' | 'implemented') => {
    const { ok } = await apiSend(`/api/change-requests/${cr.id}`, 'PATCH', { status });
    if (ok) {
      toast.success(statusLabels[status] + ' ✓');
      refetch();
    }
  };

  const handleDelete = async (cr: ApiChangeRequest) => {
    const { ok } = await apiSend(`/api/change-requests/${cr.id}`, 'DELETE');
    if (ok) refetch();
  };

  const list = changeRequests ?? [];

  return (
    <PmpViewShell
      pageId="change-requests"
      icon={<FileDiff className="h-6 w-6 text-amber-500" />}
      title={p.changeRequestsTitle}
      description={p.changeRequestsDesc}
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
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> {p.addChangeRequest}
          </Button>
        </>
      }
    >
      {/* Status summary */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(statusLabels).map(([status, label]) => (
          <Card key={status}>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold">{list.filter((cr) => cr.status === status).length}</div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {p.loading}
        </div>
      ) : list.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">{p.noData}</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {list.map((cr) => (
            <Card key={cr.id}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{cr.title}</span>
                    <Badge variant="outline" className={cn('text-[10px] border', statusStyles[cr.status])}>
                      {statusLabels[cr.status] ?? cr.status}
                    </Badge>
                    <Badge variant="secondary" className={cn('text-[10px]', priorityStyles[cr.priority])}>
                      {cr.priority}
                    </Badge>
                    {cr.project && <span className="text-xs text-muted-foreground">{cr.project.icon} {cr.project.name}</span>}
                  </div>
                  {cr.description && <p className="text-xs text-muted-foreground mt-1">{cr.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                    {cr.impactDays !== 0 && (
                      <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {cr.impactDays > 0 ? '+' : ''}{cr.impactDays} {p.days}</span>
                    )}
                    {cr.impactCost !== 0 && (
                      <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> {formatMoney(cr.impactCost)}</span>
                    )}
                    {cr.requestedBy && <span>{p.requestedBy}: {cr.requestedBy.name}</span>}
                    {cr.decidedAt && <span>{p.decidedAt}: {new Date(cr.decidedAt).toLocaleDateString('fr-FR')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {cr.status === 'pending' && (
                    <>
                      <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleDecision(cr, 'approved')}>
                        <Check className="h-3.5 w-3.5 mr-1" /> {p.approve}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/10" onClick={() => handleDecision(cr, 'rejected')}>
                        <X className="h-3.5 w-3.5 mr-1" /> {p.reject}
                      </Button>
                    </>
                  )}
                  {cr.status === 'approved' && (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleDecision(cr, 'implemented')}>
                      {p.crImplemented}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500" onClick={() => handleDelete(cr)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{p.addChangeRequest}</DialogTitle>
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
            <div>
              <Label className="text-xs">{p.riskTitleLabel}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{p.descriptionLabel}</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">{p.priorityLabel}</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{p.impactDays}</Label>
                <Input type="number" value={form.impactDays} onChange={(e) => setForm({ ...form, impactDays: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">{p.impactCost} (€)</Label>
                <Input type="number" value={form.impactCost} onChange={(e) => setForm({ ...form, impactCost: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">{p.requestedBy}</Label>
              <Select value={form.requestedById} onValueChange={(v) => setForm({ ...form, requestedById: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(users ?? []).map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{p.cancel}</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {p.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PmpViewShell>
  );
}
