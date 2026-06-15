import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-api';

// Earned-value completion weight by task status
const STATUS_WEIGHT: Record<string, number> = {
  todo: 0,
  in_progress: 0.5,
  review: 0.75,
  done: 1,
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

interface EvmTask {
  id: string;
  title: string;
  status: string;
  startDate: Date | null;
  dueDate: Date | null;
  estimatedHours: number;
  createdAt: Date;
}

function computeProjectEvm(project: {
  id: string;
  name: string;
  color: string;
  icon: string;
  budget: number;
  currency: string;
  hourlyRate: number;
  startDate: Date | null;
  endDate: Date | null;
  tasks: EvmTask[];
  timeEntries: { hours: number; hourlyRate: number }[];
}) {
  const now = new Date();
  const totalEstimatedHours = project.tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

  // BAC: explicit budget, otherwise estimated hours x hourly rate
  const bac = project.budget > 0 ? project.budget : totalEstimatedHours * project.hourlyRate;

  // AC: actual cost from logged time entries
  const ac = project.timeEntries.reduce(
    (sum, e) => sum + e.hours * (e.hourlyRate || project.hourlyRate),
    0
  );

  let pv = 0;
  let ev = 0;

  for (const task of project.tasks) {
    // Each task's budget share is proportional to its estimated hours
    const weight = totalEstimatedHours > 0 ? (task.estimatedHours || 0) / totalEstimatedHours : 1 / Math.max(1, project.tasks.length);
    const taskBudget = bac * weight;

    // Planned fraction: linear progress between start and due date
    const start = task.startDate ?? project.startDate ?? task.createdAt;
    const end = task.dueDate ?? project.endDate ?? now;
    let plannedFraction = 1;
    if (end.getTime() > start.getTime()) {
      plannedFraction = clamp01((now.getTime() - start.getTime()) / (end.getTime() - start.getTime()));
    } else {
      plannedFraction = now >= end ? 1 : 0;
    }
    pv += taskBudget * plannedFraction;

    // Earned fraction from status
    ev += taskBudget * (STATUS_WEIGHT[task.status] ?? 0);
  }

  const cpi = ac > 0 ? ev / ac : null;
  const spi = pv > 0 ? ev / pv : null;
  const cv = ev - ac;
  const sv = ev - pv;
  const eac = cpi && cpi > 0 ? bac / cpi : null;
  const etc = eac !== null ? eac - ac : null;
  const vac = eac !== null ? bac - eac : null;
  const percentComplete = bac > 0 ? (ev / bac) * 100 : 0;
  const percentSpent = bac > 0 ? (ac / bac) * 100 : 0;

  let health: 'on_track' | 'at_risk' | 'critical' = 'on_track';
  if ((cpi !== null && cpi < 0.85) || (spi !== null && spi < 0.85)) health = 'critical';
  else if ((cpi !== null && cpi < 0.95) || (spi !== null && spi < 0.95)) health = 'at_risk';

  return {
    projectId: project.id,
    projectName: project.name,
    color: project.color,
    icon: project.icon,
    currency: project.currency,
    hourlyRate: project.hourlyRate,
    taskCount: project.tasks.length,
    totalEstimatedHours,
    bac,
    pv,
    ev,
    ac,
    cv,
    sv,
    cpi,
    spi,
    eac,
    etc,
    vac,
    percentComplete,
    percentSpent,
    health,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const workspaceId = getWorkspaceIdFromRequest(request);
    const scopedWhere = projectId
      ? { id: projectId }
      : workspaceId
        ? { workspaceId }
        : undefined;

    const projects = await db.project.findMany({
      where: scopedWhere,
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            startDate: true,
            dueDate: true,
            estimatedHours: true,
            createdAt: true,
          },
        },
        timeEntries: { select: { hours: true, hourlyRate: true } },
      },
    });

    const results = projects.map(computeProjectEvm);
    return NextResponse.json(projectId ? results[0] ?? null : results);
  } catch (error) {
    console.error('GET /api/evm error:', error);
    return NextResponse.json({ error: 'Failed to compute EVM' }, { status: 500 });
  }
}
