'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useApiData, useUsers, apiSend } from '@/hooks/use-pmp-data';
import { useAppData } from '@/hooks/use-app-data';
import { useAppStore } from '@/lib/store';
import { appendWorkspaceQuery } from '@/lib/workspace-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Gauge, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PmpViewShell } from '@/components/pmp/pmp-view-shell';
import { toast } from 'sonner';

interface WorkloadUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  weeklyCapacity: number;
  openTaskCount: number;
  openHours: number;
  loggedThisWeek: number;
  utilization: number;
  level: 'under' | 'optimal' | 'over';
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    estimatedHours: number;
    dueDate: string | null;
    project: { id: string; name: string; color: string; icon: string };
  }[];
}

const UNASSIGNED = '__none__';

export function WorkloadView() {
  const { t } = useTranslation();
  const p = t.pmp;
  const activeOrganizationId = useAppStore((s) => s.activeOrganizationId);
  const { refetch: refetchAppData } = useAppData();
  const workloadUrl = activeOrganizationId
    ? appendWorkspaceQuery('/api/workload', activeOrganizationId)
    : null;
  const { data: workload, loading, refetch } = useApiData<WorkloadUser[]>(workloadUrl);
  const { data: users } = useUsers(activeOrganizationId ?? '');
  const [savingCapacityUserId, setSavingCapacityUserId] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  const levelConfig: Record<string, { label: string; cls: string; bar: string }> = {
    under: { label: p.underloaded, cls: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30', bar: 'bg-cyan-500' },
    optimal: { label: p.optimal, cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', bar: 'bg-emerald-500' },
    over: { label: p.overloaded, cls: 'bg-rose-500/10 text-rose-600 border-rose-500/30', bar: 'bg-rose-500' },
  };

  const handleCapacityChange = async (userId: string, raw: string, current: number) => {
    if (!activeOrganizationId) return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value === current) return;

    setSavingCapacityUserId(userId);
    const url = appendWorkspaceQuery(`/api/users/${userId}`, activeOrganizationId);
    const { ok } = await apiSend(url, 'PATCH', { weeklyCapacity: value });
    setSavingCapacityUserId(null);

    if (ok) {
      await refetch();
      toast.success(p.capacityUpdated);
    } else {
      toast.error(p.updateFailed);
    }
  };

  const handleReassign = async (taskId: string, newAssigneeId: string, currentAssigneeId: string) => {
    if (!activeOrganizationId || newAssigneeId === currentAssigneeId) return;

    setSavingTaskId(taskId);
    const url = appendWorkspaceQuery(`/api/tasks/${taskId}`, activeOrganizationId);
    const assigneeId = newAssigneeId === UNASSIGNED ? null : newAssigneeId;
    const { ok } = await apiSend(url, 'PATCH', { assigneeId });
    setSavingTaskId(null);

    if (ok) {
      await refetch();
      await refetchAppData();
      toast.success(p.taskReassigned);
    } else {
      toast.error(p.updateFailed);
    }
  };

  const list = workload ?? [];
  const memberOptions = users ?? [];
  const overCount = list.filter((u) => u.level === 'over').length;
  const totalOpenHours = list.reduce((sum, u) => sum + u.openHours, 0);

  return (
    <PmpViewShell
      pageId="workload"
      icon={<Gauge className="h-6 w-6 text-blue-500" />}
      title={p.workloadTitle}
      description={p.workloadDesc}
    >
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{list.length}</div>
            <div className="text-[11px] text-muted-foreground">{t.sidebar.members}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{totalOpenHours.toFixed(0)}h</div>
            <div className="text-[11px] text-muted-foreground">{p.estimatedHoursLabel}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={cn('text-2xl font-bold', overCount > 0 && 'text-rose-500')}>{overCount}</div>
            <div className="text-[11px] text-muted-foreground">{p.overloaded}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {p.loading}
        </div>
      ) : list.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">{p.noData}</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {list.map((user) => {
            const config = levelConfig[user.level];
            return (
              <Card key={user.userId}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="text-xs font-semibold">
                        {user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{user.name}</span>
                        <Badge variant="outline" className={cn('text-[10px] border', config.cls)}>{config.label}</Badge>
                        <span className="text-xs text-muted-foreground">{user.role}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground mt-0.5">
                        <span>{p.openTasks}: {user.openTaskCount}</span>
                        <span>{p.estimatedHoursLabel}: {user.openHours.toFixed(1)}h</span>
                        <span className="inline-flex items-center gap-1">
                          {p.capacity}:
                          <Input
                            key={`${user.userId}-${user.weeklyCapacity}`}
                            type="number"
                            min={0}
                            step={1}
                            title={p.editCapacity}
                            className="h-6 w-14 px-1.5 text-[11px] text-center"
                            defaultValue={user.weeklyCapacity}
                            disabled={savingCapacityUserId === user.userId}
                            onBlur={(e) => handleCapacityChange(user.userId, e.target.value, user.weeklyCapacity)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                          />
                          h
                          {savingCapacityUserId === user.userId && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                        </span>
                        <span>{p.loggedThisWeek}: {user.loggedThisWeek.toFixed(1)}h</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={cn(
                        'text-lg font-bold',
                        user.level === 'over' ? 'text-rose-500' : user.level === 'under' ? 'text-cyan-500' : 'text-emerald-500'
                      )}>
                        {user.utilization.toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">{p.utilization}</div>
                    </div>
                  </div>
                  <div className="mt-3 relative">
                    <Progress value={Math.min(150, user.utilization) / 1.5} className="h-2.5" />
                    <div className="absolute top-0 bottom-0 w-px bg-foreground/40" style={{ left: `${100 / 1.5}%` }} />
                  </div>
                  {user.tasks.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {user.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5"
                        >
                          <span className="flex-1 min-w-0 truncate text-[11px]">
                            {task.project.icon} {task.title}
                            {task.estimatedHours > 0 ? ` · ${task.estimatedHours}h` : ''}
                          </span>
                          <Select
                            value={user.userId}
                            onValueChange={(v) => handleReassign(task.id, v, user.userId)}
                            disabled={savingTaskId === task.id}
                          >
                            <SelectTrigger className="h-7 w-[150px] text-[10px] shrink-0">
                              <SelectValue placeholder={p.reassignTask} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UNASSIGNED}>{p.unassigned}</SelectItem>
                              {memberOptions
                                .filter((m) => m.id !== user.userId)
                                .map((member) => (
                                  <SelectItem key={member.id} value={member.id}>
                                    {member.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {savingTaskId === task.id && (
                            <Loader2 className="h-3 w-3 animate-spin shrink-0 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PmpViewShell>
  );
}
