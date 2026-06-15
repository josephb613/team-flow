'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useApiData, useProjects, useUsers, apiSend, formatMoney } from '@/hooks/use-pmp-data';
import { useAppStore } from '@/lib/store';
import { appendWorkspaceQuery } from '@/lib/workspace-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Wallet, Loader2, Camera, Timer, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PmpViewShell } from '@/components/pmp/pmp-view-shell';

interface EvmData {
  projectId: string;
  projectName: string;
  color: string;
  icon: string;
  currency: string;
  hourlyRate: number;
  taskCount: number;
  totalEstimatedHours: number;
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  cv: number;
  sv: number;
  cpi: number | null;
  spi: number | null;
  eac: number | null;
  etc: number | null;
  vac: number | null;
  percentComplete: number;
  percentSpent: number;
  health: 'on_track' | 'at_risk' | 'critical';
}

interface ApiBaseline {
  id: string;
  name: string;
  type: string;
  snapshot: string;
  createdAt: string;
  project?: { id: string; name: string; icon: string };
}

interface ApiTaskLite {
  id: string;
  title: string;
  projectId: string;
}

function IndexBadge({ value, label }: { value: number | null; label: string }) {
  if (value === null) {
    return (
      <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
        <span className="text-lg font-bold text-muted-foreground">—</span>
        <span className="text-[10px] text-muted-foreground text-center">{label}</span>
      </div>
    );
  }
  const good = value >= 1;
  const warn = value >= 0.95 && value < 1;
  return (
    <div className={cn(
      'flex flex-col items-center p-3 rounded-lg',
      good ? 'bg-emerald-500/10' : warn ? 'bg-amber-500/10' : 'bg-rose-500/10'
    )}>
      <span className={cn(
        'text-lg font-bold flex items-center gap-1',
        good ? 'text-emerald-600' : warn ? 'text-amber-600' : 'text-rose-600'
      )}>
        {good ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        {value.toFixed(2)}
      </span>
      <span className="text-[10px] text-muted-foreground text-center">{label}</span>
    </div>
  );
}

export function CostsView() {
  const { t } = useTranslation();
  const p = t.pmp;
  const activeOrganizationId = useAppStore((s) => s.activeOrganizationId);
  const { data: projects, refetch: refetchProjects } = useProjects(activeOrganizationId);
  const { data: users } = useUsers(activeOrganizationId);
  const evmUrl = activeOrganizationId ? appendWorkspaceQuery('/api/evm', activeOrganizationId) : null;
  const baselinesUrl = activeOrganizationId
    ? appendWorkspaceQuery('/api/baselines', activeOrganizationId)
    : null;
  const tasksUrl = activeOrganizationId ? appendWorkspaceQuery('/api/tasks', activeOrganizationId) : null;
  const { data: evmList, loading, refetch: refetchEvm } = useApiData<EvmData[]>(evmUrl);
  const { data: baselines, refetch: refetchBaselines } = useApiData<ApiBaseline[]>(baselinesUrl);
  const { data: allTasks } = useApiData<ApiTaskLite[]>(tasksUrl);

  const [budgetDialog, setBudgetDialog] = useState<EvmData | null>(null);
  const [budgetForm, setBudgetForm] = useState({ budget: '', hourlyRate: '' });
  const [baselineDialog, setBaselineDialog] = useState<EvmData | null>(null);
  const [baselineName, setBaselineName] = useState('');
  const [timeDialog, setTimeDialog] = useState<EvmData | null>(null);
  const [timeForm, setTimeForm] = useState({ taskId: '', hours: '', userId: '' });
  const [saving, setSaving] = useState(false);

  const healthLabels: Record<string, { label: string; cls: string }> = {
    on_track: { label: p.onTrack, cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
    at_risk: { label: p.atRisk, cls: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
    critical: { label: p.criticalHealth, cls: 'bg-rose-500/10 text-rose-600 border-rose-500/30' },
  };

  const saveBudget = async () => {
    if (!budgetDialog) return;
    setSaving(true);
    const { ok } = await apiSend(`/api/projects/${budgetDialog.projectId}`, 'PATCH', {
      budget: Number(budgetForm.budget) || 0,
      hourlyRate: Number(budgetForm.hourlyRate) || 50,
    });
    setSaving(false);
    if (ok) {
      toast.success(p.budget + ' ✓');
      setBudgetDialog(null);
      refetchEvm();
      refetchProjects();
    } else {
      toast.error('Erreur');
    }
  };

  const saveBaseline = async () => {
    if (!baselineDialog || !baselineName) return;
    setSaving(true);
    const { ok } = await apiSend('/api/baselines', 'POST', {
      name: baselineName,
      type: 'integrated',
      projectId: baselineDialog.projectId,
    });
    setSaving(false);
    if (ok) {
      toast.success(p.baselines + ' ✓');
      setBaselineDialog(null);
      setBaselineName('');
      refetchBaselines();
    } else {
      toast.error('Erreur');
    }
  };

  const saveTime = async () => {
    if (!timeDialog || !timeForm.taskId || !timeForm.hours) return;
    setSaving(true);
    const { ok } = await apiSend('/api/time-entries', 'POST', {
      taskId: timeForm.taskId,
      hours: Number(timeForm.hours),
      userId: timeForm.userId || null,
    });
    setSaving(false);
    if (ok) {
      toast.success(p.logTime + ' ✓');
      setTimeDialog(null);
      setTimeForm({ taskId: '', hours: '', userId: '' });
      refetchEvm();
    } else {
      toast.error('Erreur');
    }
  };

  const deleteBaseline = async (b: ApiBaseline) => {
    const { ok } = await apiSend(`/api/baselines/${b.id}`, 'DELETE');
    if (ok) refetchBaselines();
  };

  return (
    <PmpViewShell
      pageId="costs"
      icon={<Wallet className="h-6 w-6 text-emerald-500" />}
      title={p.costsTitle}
      description={p.costsDesc}
    >
      {loading ? (
        <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {p.loading}
        </div>
      ) : (evmList ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">{p.noData}</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {(evmList ?? []).map((evm) => {
            const health = healthLabels[evm.health];
            const projectTasks = (allTasks ?? []).filter((task) => task.projectId === evm.projectId);
            return (
              <Card key={evm.projectId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{evm.icon}</span> {evm.projectName}
                      <Badge variant="outline" className={cn('text-[10px] border', health.cls)}>{health.label}</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs"
                        onClick={() => {
                          setBudgetForm({ budget: String(evm.bac), hourlyRate: String(evm.hourlyRate) });
                          setBudgetDialog(evm);
                        }}
                      >
                        {p.editBudget}
                      </Button>
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs"
                        disabled={projectTasks.length === 0}
                        onClick={() => setTimeDialog(evm)}
                      >
                        <Timer className="h-3 w-3 mr-1" /> {p.logTime}
                      </Button>
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs"
                        onClick={() => setBaselineDialog(evm)}
                      >
                        <Camera className="h-3 w-3 mr-1" /> {p.createBaseline}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Money figures */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    {[
                      { label: p.bac, value: evm.bac },
                      { label: p.pv, value: evm.pv },
                      { label: p.ev, value: evm.ev },
                      { label: p.ac, value: evm.ac },
                    ].map((kpi) => (
                      <div key={kpi.label} className="p-3 rounded-lg bg-muted/40">
                        <div className="text-sm font-bold">{formatMoney(kpi.value, evm.currency)}</div>
                        <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Indices + forecast */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <IndexBadge value={evm.cpi} label={p.cpi} />
                    <IndexBadge value={evm.spi} label={p.spi} />
                    <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                      <span className="text-sm font-bold">{evm.eac !== null ? formatMoney(evm.eac, evm.currency) : '—'}</span>
                      <span className="text-[10px] text-muted-foreground text-center">{p.eac}</span>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                      <span className={cn('text-sm font-bold', evm.vac !== null && evm.vac < 0 ? 'text-rose-600' : 'text-emerald-600')}>
                        {evm.vac !== null ? formatMoney(evm.vac, evm.currency) : '—'}
                      </span>
                      <span className="text-[10px] text-muted-foreground text-center">{p.vac}</span>
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{p.percentComplete}</span>
                        <span className="font-medium">{evm.percentComplete.toFixed(0)}%</span>
                      </div>
                      <Progress value={Math.min(100, evm.percentComplete)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{p.percentSpent}</span>
                        <span className={cn('font-medium', evm.percentSpent > evm.percentComplete && 'text-rose-600')}>
                          {evm.percentSpent.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={Math.min(100, evm.percentSpent)} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Baselines */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Camera className="h-4 w-4" /> {p.baselines}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(baselines ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{p.noData}</p>
          ) : (
            <div className="space-y-2">
              {(baselines ?? []).map((b) => {
                let info = '';
                try {
                  const snap = JSON.parse(b.snapshot);
                  info = `${snap.taskCount} tâches · ${formatMoney(snap.budget ?? 0, snap.currency ?? 'EUR')} · AC ${formatMoney(snap.actualCost ?? 0, snap.currency ?? 'EUR')}`;
                } catch { /* corrupt snapshot, show raw dates only */ }
                return (
                  <div key={b.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {b.project && <span>{b.project.icon}</span>}
                        {b.name}
                        <Badge variant="outline" className="text-[10px]">{b.type}</Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(b.createdAt).toLocaleString('fr-FR')} {info && `· ${info}`}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-500" onClick={() => deleteBaseline(b)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget dialog */}
      <Dialog open={budgetDialog !== null} onOpenChange={(open) => !open && setBudgetDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{p.editBudget} — {budgetDialog?.projectName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{p.budget} ({budgetDialog?.currency})</Label>
              <Input type="number" value={budgetForm.budget} onChange={(e) => setBudgetForm({ ...budgetForm, budget: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{p.hourlyRate} ({budgetDialog?.currency}/h)</Label>
              <Input type="number" value={budgetForm.hourlyRate} onChange={(e) => setBudgetForm({ ...budgetForm, hourlyRate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialog(null)}>{p.cancel}</Button>
            <Button onClick={saveBudget} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {p.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Baseline dialog */}
      <Dialog open={baselineDialog !== null} onOpenChange={(open) => !open && setBaselineDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{p.createBaseline} — {baselineDialog?.projectName}</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-xs">{p.baselineName}</Label>
            <Input value={baselineName} onChange={(e) => setBaselineName(e.target.value)} placeholder="Baseline v1.0" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaselineDialog(null)}>{p.cancel}</Button>
            <Button onClick={saveBaseline} disabled={saving || !baselineName}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {p.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log time dialog */}
      <Dialog open={timeDialog !== null} onOpenChange={(open) => !open && setTimeDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{p.logTime} — {timeDialog?.projectName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{p.taskLabel}</Label>
              <Select value={timeForm.taskId} onValueChange={(v) => setTimeForm({ ...timeForm, taskId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(allTasks ?? []).filter((task) => task.projectId === timeDialog?.projectId).map((task) => (
                    <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{p.hours}</Label>
              <Input type="number" step="0.5" min="0" value={timeForm.hours} onChange={(e) => setTimeForm({ ...timeForm, hours: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{p.ownerLabel}</Label>
              <Select value={timeForm.userId} onValueChange={(v) => setTimeForm({ ...timeForm, userId: v })}>
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
            <Button variant="outline" onClick={() => setTimeDialog(null)}>{p.cancel}</Button>
            <Button onClick={saveTime} disabled={saving || !timeForm.taskId || !timeForm.hours}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {p.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PmpViewShell>
  );
}
