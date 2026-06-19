import { db } from '@/lib/db';

const STATUS_WEIGHT: Record<string, number> = {
  todo: 0,
  in_progress: 0.5,
  review: 0.75,
  done: 1,
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export interface EvmTask {
  id: string;
  title: string;
  status: string;
  startDate: Date | null;
  dueDate: Date | null;
  estimatedHours: number;
  createdAt: Date;
}

export interface ProjectEvmInput {
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
}

export interface ProjectEvmResult {
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

export function computeProjectEvm(project: ProjectEvmInput): ProjectEvmResult {
  const now = new Date();
  const totalEstimatedHours = project.tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

  const bac = project.budget > 0 ? project.budget : totalEstimatedHours * project.hourlyRate;

  const ac = project.timeEntries.reduce(
    (sum, e) => sum + e.hours * (e.hourlyRate || project.hourlyRate),
    0
  );

  let pv = 0;
  let ev = 0;

  for (const task of project.tasks) {
    const weight =
      totalEstimatedHours > 0
        ? (task.estimatedHours || 0) / totalEstimatedHours
        : 1 / Math.max(1, project.tasks.length);
    const taskBudget = bac * weight;

    const start = task.startDate ?? project.startDate ?? task.createdAt;
    const end = task.dueDate ?? project.endDate ?? now;
    let plannedFraction = 1;
    if (end.getTime() > start.getTime()) {
      plannedFraction = clamp01(
        (now.getTime() - start.getTime()) / (end.getTime() - start.getTime())
      );
    } else {
      plannedFraction = now >= end ? 1 : 0;
    }
    pv += taskBudget * plannedFraction;

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

export async function getEvmSummary(
  workspaceId: string,
  projectId?: string
): Promise<ProjectEvmResult | ProjectEvmResult[] | null> {
  const scopedWhere = projectId ? { id: projectId, workspaceId } : { workspaceId };

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
  return projectId ? results[0] ?? null : results;
}
