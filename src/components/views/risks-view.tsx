'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useApiData, useProjects, useUsers, apiSend } from '@/hooks/use-pmp-data';
import { useAppData } from '@/hooks/use-app-data';
import { useAppStore } from '@/lib/store';
import { appendWorkspaceQuery } from '@/lib/workspace-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ShieldAlert, Plus, Trash2, Loader2, Pencil, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { matrixCellColor, scoreColor } from '@/lib/risk-utils';
import { PmpViewShell } from '@/components/pmp/pmp-view-shell';

interface RelatedTask {
  id: string;
  title: string;
  status: string;
}

interface ApiRisk {
  id: string;
  title: string;
  description: string | null;
  category: string;
  probability: number;
  impact: number;
  status: string;
  response: string;
  mitigationPlan: string | null;
  taskIds: string[];
  score?: number;
  ownerId: string | null;
  projectId: string;
  owner?: { id: string; name: string } | null;
  project?: { id: string; name: string; icon: string };
  relatedTasks?: RelatedTask[];
}

const emptyForm = {
  title: '',
  description: '',
  category: 'technical',
  probability: 3,
  impact: 3,
  status: 'open',
  response: 'mitigate',
  mitigationPlan: '',
  ownerId: '',
  taskIds: [] as string[],
};

export function RisksView() {
  const { t } = useTranslation();
  const p = t.pmp;
  const { tasks } = useAppData();
  const activeOrganizationId = useAppStore((s) => s.activeOrganizationId);
  const { data: projects } = useProjects(activeOrganizationId);
  const { data: users } = useUsers(activeOrganizationId);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const risksUrl = useMemo(() => {
    const base =
      projectFilter === 'all' ? '/api/risks' : `/api/risks?projectId=${projectFilter}`;
    return activeOrganizationId ? appendWorkspaceQuery(base, activeOrganizationId) : null;
  }, [projectFilter, activeOrganizationId]);
  const { data: risks, loading, refetch } = useApiData<ApiRisk[]>(risksUrl);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<ApiRisk | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formProjectId, setFormProjectId] = useState('');
  const [saving, setSaving] = useState(false);

  const statusLabels: Record<string, string> = {
    open: p.riskOpen, mitigating: p.riskMitigating, closed: p.riskClosed, occurred: p.riskOccurred,
  };
  const responseLabels: Record<string, string> = {
    avoid: p.respAvoid, mitigate: p.respMitigate, transfer: p.respTransfer, accept: p.respAccept,
  };
  const categoryLabels: Record<string, string> = {
    technical: p.catTechnical, external: p.catExternal,
    organizational: p.catOrganizational, project_management: p.catProjectManagement,
  };

  const projectTasks = useMemo(
    () => (formProjectId ? tasks.filter((task) => task.projectId === formProjectId) : []),
    [tasks, formProjectId]
  );

  const matrix = useMemo(() => {
    const cells = new Map<string, ApiRisk[]>();
    for (const risk of risks ?? []) {
      const key = `${risk.probability}-${risk.impact}`;
      cells.set(key, [...(cells.get(key) || []), risk]);
    }
    return cells;
  }, [risks]);

  const openCreateDialog = () => {
    setEditingRisk(null);
    setForm({ ...emptyForm, taskIds: [] });
    setFormProjectId(projects?.[0]?.id ?? '');
    setDialogOpen(true);
  };

  const openEditDialog = (risk: ApiRisk) => {
    setEditingRisk(risk);
    setForm({
      title: risk.title,
      description: risk.description ?? '',
      category: risk.category,
      probability: risk.probability,
      impact: risk.impact,
      status: risk.status,
      response: risk.response,
      mitigationPlan: risk.mitigationPlan ?? '',
      ownerId: risk.ownerId ?? '',
      taskIds: risk.taskIds ?? [],
    });
    setFormProjectId(risk.projectId);
    setDialogOpen(true);
  };

  const toggleTaskId = (taskId: string) => {
    setForm((prev) => ({
      ...prev,
      taskIds: prev.taskIds.includes(taskId)
        ? prev.taskIds.filter((id) => id !== taskId)
        : [...prev.taskIds, taskId],
    }));
  };

  const handleSave = async () => {
    if (!form.title || !formProjectId) {
      toast.error(`${p.riskTitleLabel} + ${p.project} requis`);
      return;
    }
    setSaving(true);

    const payload = {
      ...form,
      ownerId: form.ownerId || null,
      taskIds: form.taskIds,
      ...(editingRisk ? {} : { projectId: formProjectId }),
    };

    const { ok } = editingRisk
      ? await apiSend(`/api/risks/${editingRisk.id}`, 'PATCH', payload)
      : await apiSend('/api/risks', 'POST', { ...payload, projectId: formProjectId });

    setSaving(false);
    if (ok) {
      toast.success(editingRisk ? p.riskUpdated : p.risksTitle + ' ✓');
      setDialogOpen(false);
      setEditingRisk(null);
      setForm({ ...emptyForm, taskIds: [] });
      refetch();
    } else {
      toast.error(editingRisk ? p.riskUpdateError : 'Erreur lors de la création');
    }
  };

  const handleStatusChange = async (risk: ApiRisk, status: string) => {
    const { ok } = await apiSend(`/api/risks/${risk.id}`, 'PATCH', { status });
    if (ok) refetch();
  };

  const handleDelete = async (risk: ApiRisk) => {
    const { ok } = await apiSend(`/api/risks/${risk.id}`, 'DELETE');
    if (ok) {
      toast.success(p.delete + ' ✓');
      refetch();
    }
  };

  return (
    <PmpViewShell
      pageId="risks"
      icon={<ShieldAlert className="h-6 w-6 text-rose-500" />}
      title={p.risksTitle}
      description={p.risksDesc}
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
            <Plus className="h-4 w-4 mr-1" /> {p.addRisk}
          </Button>
        </>
      }
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{p.matrix}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex flex-col justify-between py-1 text-[10px] text-muted-foreground w-16 text-right pr-1">
              <span>{p.probability} 5</span>
              <span>1</span>
            </div>
            <div className="flex-1 grid grid-cols-5 gap-1">
              {[5, 4, 3, 2, 1].map((prob) =>
                [1, 2, 3, 4, 5].map((imp) => {
                  const cellRisks = matrix.get(`${prob}-${imp}`) || [];
                  return (
                    <div
                      key={`${prob}-${imp}`}
                      className={cn(
                        'h-12 rounded-md flex items-center justify-center text-sm font-bold transition-transform hover:scale-[1.03]',
                        matrixCellColor(prob, imp),
                        cellRisks.length === 0 && 'opacity-25'
                      )}
                      title={cellRisks.map((r) => r.title).join(', ')}
                    >
                      {cellRisks.length > 0 ? cellRisks.length : ''}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="flex justify-between mt-1 pl-16 text-[10px] text-muted-foreground">
            <span>{p.impact} 1</span>
            <span>5</span>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {p.loading}
        </div>
      ) : (risks ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">{p.noData}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {(risks ?? []).map((risk) => {
            const score = risk.score ?? risk.probability * risk.impact;
            const linkedTasks = risk.relatedTasks ?? [];
            return (
              <Card key={risk.id} className="overflow-hidden">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0', scoreColor(score))}>
                    {score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{risk.title}</span>
                      <Badge variant="outline" className="text-[10px]">{categoryLabels[risk.category] ?? risk.category}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{responseLabels[risk.response] ?? risk.response}</Badge>
                      {risk.project && <span className="text-xs text-muted-foreground">{risk.project.icon} {risk.project.name}</span>}
                    </div>
                    {risk.description && <p className="text-xs text-muted-foreground mt-1 truncate">{risk.description}</p>}
                    {risk.mitigationPlan && (
                      <p className="text-xs mt-1"><span className="text-muted-foreground">{p.mitigationLabel}:</span> {risk.mitigationPlan}</p>
                    )}
                    {linkedTasks.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <Link2 className="h-3 w-3 text-muted-foreground" />
                        {linkedTasks.map((task) => (
                          <Badge key={task.id} variant="outline" className="text-[10px] font-normal">
                            {task.title}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                      <span>{p.probability}: {risk.probability}/5</span>
                      <span>{p.impact}: {risk.impact}/5</span>
                      {risk.owner && <span>{p.ownerLabel}: {risk.owner.name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Select value={risk.status} onValueChange={(v) => handleStatusChange(risk, v)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(risk)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500" onClick={() => handleDelete(risk)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setEditingRisk(null);
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRisk ? p.editRisk : p.addRisk}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{p.project}</Label>
              <Select
                value={formProjectId}
                onValueChange={(v) => {
                  setFormProjectId(v);
                  if (!editingRisk) setForm((prev) => ({ ...prev, taskIds: [] }));
                }}
                disabled={Boolean(editingRisk)}
              >
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{p.categoryLabel}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{p.responseLabel}</Label>
                <Select value={form.response} onValueChange={(v) => setForm({ ...form, response: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(responseLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{p.probability} (1-5)</Label>
                <Select value={String(form.probability)} onValueChange={(v) => setForm({ ...form, probability: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{p.impact} (1-5)</Label>
                <Select value={String(form.impact)} onValueChange={(v) => setForm({ ...form, impact: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {editingRisk && (
                <div className="col-span-2">
                  <Label className="text-xs">{p.statusLabel}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">{p.ownerLabel}</Label>
              <Select value={form.ownerId} onValueChange={(v) => setForm({ ...form, ownerId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(users ?? []).map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{p.mitigationLabel}</Label>
              <Textarea rows={2} value={form.mitigationPlan} onChange={(e) => setForm({ ...form, mitigationPlan: e.target.value })} />
            </div>
            {formProjectId && (
              <div>
                <Label className="text-xs">{p.relatedTasks}</Label>
                <p className="text-[11px] text-muted-foreground mb-2">{p.relatedTasksHint}</p>
                {projectTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{p.noRelatedTasks}</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto rounded-md border p-2 space-y-2">
                    {projectTasks.map((task) => (
                      <label key={task.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={form.taskIds.includes(task.id)}
                          onCheckedChange={() => toggleTaskId(task.id)}
                        />
                        <span className="truncate">{task.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{p.cancel}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingRisk ? p.save : p.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PmpViewShell>
  );
}
