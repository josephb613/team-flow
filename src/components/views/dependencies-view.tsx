'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useProjects, apiSend } from '@/hooks/use-pmp-data';
import { useAppStore } from '@/lib/store';
import { appendWorkspaceQuery } from '@/lib/workspace-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { GitBranch, Plus, Trash2, Loader2, ArrowRight, Flame, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getRiskScore } from '@/lib/risk-utils';
import { PmpViewShell } from '@/components/pmp/pmp-view-shell';

interface CpmTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  duration: number;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  slack: number;
  critical: boolean;
  predecessorIds: string[];
  successorIds: string[];
  assigneeName: string | null;
}

interface CpmDependency {
  id: string;
  predecessorId: string;
  successorId: string;
  type: string;
  lagDays: number;
}

interface CpmResult {
  projectId: string;
  projectDuration: number;
  criticalPath: string[];
  dependencies: CpmDependency[];
  tasks: CpmTask[];
}

interface ApiRisk {
  id: string;
  title: string;
  probability: number;
  impact: number;
  taskIds: string[];
  score?: number;
}

export function DependenciesView() {
  const { t } = useTranslation();
  const p = t.pmp;
  const activeOrganizationId = useAppStore((s) => s.activeOrganizationId);
  const { data: projects } = useProjects(activeOrganizationId);
  const [projectId, setProjectId] = useState<string>('');
  const [cpm, setCpm] = useState<CpmResult | null>(null);
  const [projectRisks, setProjectRisks] = useState<ApiRisk[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [depForm, setDepForm] = useState({ predecessorId: '', successorId: '', type: 'FS', lagDays: '0' });
  const [saving, setSaving] = useState(false);

  // Auto-select first project
  useEffect(() => {
    if (!projectId && projects && projects.length > 0) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  const loadCpm = async (pid: string) => {
    setLoading(true);
    try {
      const risksUrl = appendWorkspaceQuery(
        `/api/risks?projectId=${pid}&activeOnly=true`,
        activeOrganizationId
      );
      const [cpmRes, risksRes] = await Promise.all([
        fetch(`/api/critical-path?projectId=${pid}`),
        fetch(risksUrl),
      ]);
      if (cpmRes.ok) setCpm(await cpmRes.json());
      if (risksRes.ok) setProjectRisks(await risksRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadCpm(projectId);
  }, [projectId]);

  const taskById = new Map((cpm?.tasks ?? []).map((task) => [task.id, task]));

  const handleCreateDep = async () => {
    if (!depForm.predecessorId || !depForm.successorId) return;
    setSaving(true);
    const { ok, data } = await apiSend('/api/dependencies', 'POST', {
      predecessorId: depForm.predecessorId,
      successorId: depForm.successorId,
      type: depForm.type,
      lagDays: Number(depForm.lagDays) || 0,
    });
    setSaving(false);
    if (ok) {
      toast.success(p.dependenciesList + ' ✓');
      setDialogOpen(false);
      setDepForm({ predecessorId: '', successorId: '', type: 'FS', lagDays: '0' });
      loadCpm(projectId);
    } else {
      const msg = (data as { error?: string })?.error;
      toast.error(msg || p.cycleError);
    }
  };

  const handleDeleteDep = async (dep: CpmDependency) => {
    const { ok } = await apiSend(`/api/dependencies/${dep.id}`, 'DELETE');
    if (ok) loadCpm(projectId);
  };

  const criticalCount = (cpm?.tasks ?? []).filter((task) => task.critical).length;

  const risksByTaskId = useMemo(() => {
    const map = new Map<string, ApiRisk[]>();
    for (const risk of projectRisks) {
      for (const taskId of risk.taskIds ?? []) {
        map.set(taskId, [...(map.get(taskId) ?? []), risk]);
      }
    }
    return map;
  }, [projectRisks]);

  const criticalTasksWithRisks = useMemo(
    () => (cpm?.tasks ?? []).filter((task) => task.critical && (risksByTaskId.get(task.id)?.length ?? 0) > 0).length,
    [cpm, risksByTaskId]
  );

  return (
    <PmpViewShell
      pageId="dependencies"
      icon={<GitBranch className="h-6 w-6 text-violet-500" />}
      title={p.criticalPathTitle}
      description={p.criticalPathDesc}
      actions={
        <>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={p.selectProject} />
            </SelectTrigger>
            <SelectContent>
              {(projects ?? []).map((proj) => (
                <SelectItem key={proj.id} value={proj.id}>{proj.icon} {proj.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setDialogOpen(true)} disabled={!projectId}>
            <Plus className="h-4 w-4 mr-1" /> {p.addDependency}
          </Button>
        </>
      }
    >
      {/* KPIs */}
      {cpm && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{cpm.projectDuration}</div>
              <div className="text-[11px] text-muted-foreground">{p.projectDuration} ({p.days})</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-rose-500 flex items-center justify-center gap-1">
                <Flame className="h-5 w-5" /> {criticalCount}
              </div>
              <div className="text-[11px] text-muted-foreground">{p.critical}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-500 flex items-center justify-center gap-1">
                <ShieldAlert className="h-5 w-5" /> {criticalTasksWithRisks}
              </div>
              <div className="text-[11px] text-muted-foreground">{p.linkedRisks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{cpm.dependencies.length}</div>
              <div className="text-[11px] text-muted-foreground">{p.dependenciesList}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {p.loading}
        </div>
      ) : cpm ? (
        <>
          {/* CPM network table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{p.networkTable}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-muted-foreground border-b">
                      <th className="text-left py-2 pr-2 font-medium">{p.taskLabel}</th>
                      <th className="text-center py-2 px-2 font-medium">{p.duration}</th>
                      <th className="text-center py-2 px-2 font-medium">ES</th>
                      <th className="text-center py-2 px-2 font-medium">EF</th>
                      <th className="text-center py-2 px-2 font-medium">LS</th>
                      <th className="text-center py-2 px-2 font-medium">LF</th>
                      <th className="text-center py-2 px-2 font-medium">{p.slack}</th>
                      <th className="text-center py-2 pl-2 font-medium">{p.critical}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cpm.tasks.map((task) => {
                      const linkedRisks = risksByTaskId.get(task.id) ?? [];
                      return (
                      <tr key={task.id} className={cn('border-b last:border-0', task.critical && 'bg-rose-500/5')}>
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2">
                            {task.critical && <Flame className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />}
                            <span className={cn('truncate max-w-[260px]', task.critical && 'font-medium')}>{task.title}</span>
                          </div>
                          {task.assigneeName && <span className="text-[10px] text-muted-foreground">{task.assigneeName}</span>}
                          {linkedRisks.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-1">
                              <ShieldAlert className="h-3 w-3 text-orange-500" />
                              {linkedRisks.map((risk) => (
                                <Badge key={risk.id} variant="outline" className="text-[9px] font-normal px-1 py-0">
                                  {risk.title} ({risk.score ?? getRiskScore(risk.probability, risk.impact)})
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="text-center px-2">{task.duration}j</td>
                        <td className="text-center px-2 text-muted-foreground">{task.es}</td>
                        <td className="text-center px-2 text-muted-foreground">{task.ef}</td>
                        <td className="text-center px-2 text-muted-foreground">{task.ls}</td>
                        <td className="text-center px-2 text-muted-foreground">{task.lf}</td>
                        <td className="text-center px-2">
                          <Badge variant={task.slack <= 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                            {task.slack}j
                          </Badge>
                        </td>
                        <td className="text-center pl-2">{task.critical ? '🔥' : '—'}</td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Dependency list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{p.dependenciesList}</CardTitle>
            </CardHeader>
            <CardContent>
              {cpm.dependencies.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{p.noDependencies}</p>
              ) : (
                <div className="space-y-2">
                  {cpm.dependencies.map((dep) => {
                    const pred = taskById.get(dep.predecessorId);
                    const succ = taskById.get(dep.successorId);
                    return (
                      <div key={dep.id} className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20 text-sm">
                        <span className="truncate flex-1 text-right">{pred?.title ?? '?'}</span>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">{dep.type}{dep.lagDays !== 0 ? ` +${dep.lagDays}j` : ''}</Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate flex-1">{succ?.title ?? '?'}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-rose-500" onClick={() => handleDeleteDep(dep)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">{p.noData}</CardContent></Card>
      )}

      {/* Add dependency dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{p.addDependency}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{p.predecessor}</Label>
              <Select value={depForm.predecessorId} onValueChange={(v) => setDepForm({ ...depForm, predecessorId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(cpm?.tasks ?? []).map((task) => (
                    <SelectItem key={task.id} value={task.id} disabled={task.id === depForm.successorId}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{p.successor}</Label>
              <Select value={depForm.successorId} onValueChange={(v) => setDepForm({ ...depForm, successorId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(cpm?.tasks ?? []).map((task) => (
                    <SelectItem key={task.id} value={task.id} disabled={task.id === depForm.predecessorId}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{p.depType}</Label>
                <Select value={depForm.type} onValueChange={(v) => setDepForm({ ...depForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FS">FS (Fin → Début)</SelectItem>
                    <SelectItem value="SS">SS (Début → Début)</SelectItem>
                    <SelectItem value="FF">FF (Fin → Fin)</SelectItem>
                    <SelectItem value="SF">SF (Début → Fin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{p.lag}</Label>
                <Input type="number" value={depForm.lagDays} onChange={(e) => setDepForm({ ...depForm, lagDays: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{p.cancel}</Button>
            <Button onClick={handleCreateDep} disabled={saving || !depForm.predecessorId || !depForm.successorId}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {p.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PmpViewShell>
  );
}
