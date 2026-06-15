import type { Project, Sprint, Task, TimeEntry } from './types';

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface PeriodTrend {
  current: number;
  previous: number;
  delta: number;
  trend: TrendDirection;
  change: string;
}

const MS_PER_DAY = 86400000;

export function getPeriodBounds(days: number): { currentStart: Date; previousStart: Date; now: Date } {
  const now = new Date();
  const currentStart = new Date(now.getTime() - days * MS_PER_DAY);
  const previousStart = new Date(now.getTime() - days * 2 * MS_PER_DAY);
  return { currentStart, previousStart, now };
}

export function isInPeriod(dateStr: string, start: Date, end: Date): boolean {
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function trendDirection(delta: number, invert = false): TrendDirection {
  if (delta === 0) return 'up';
  const positive = delta > 0;
  if (invert) return positive ? 'down' : 'up';
  return positive ? 'up' : 'down';
}

function formatPercentChange(current: number, previous: number): string {
  if (previous === 0) {
    if (current === 0) return '0%';
    return '+100%';
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

function formatAbsoluteChange(delta: number, suffix = ''): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return `0${suffix}`;
  return rounded > 0 ? `+${rounded}${suffix}` : `${rounded}${suffix}`;
}

function formatPointsChange(current: number, previous: number): string {
  const delta = Math.round((current - previous) * 10) / 10;
  return formatAbsoluteChange(delta, '%');
}

export function compareCounts(current: number, previous: number, format: 'percent' | 'absolute' | 'points' | 'hours' = 'percent'): PeriodTrend {
  const delta = current - previous;
  let change: string;
  switch (format) {
    case 'absolute':
      change = formatAbsoluteChange(delta);
      break;
    case 'hours':
      change = formatAbsoluteChange(delta, 'h');
      break;
    case 'points':
      change = formatPointsChange(current, previous);
      break;
    default:
      change = formatPercentChange(current, previous);
  }
  return { current, previous, delta, trend: trendDirection(delta), change };
}

export function compareCountsInverted(current: number, previous: number): PeriodTrend {
  const delta = current - previous;
  return {
    current,
    previous,
    delta,
    trend: trendDirection(delta, true),
    change: formatAbsoluteChange(delta),
  };
}

// ─── Task metrics ───────────────────────────────────────────────────────────

export function countTasksCompletedInPeriod(tasks: Task[], start: Date, end: Date): number {
  return tasks.filter((t) => t.status === 'done' && isInPeriod(t.updatedAt, start, end)).length;
}

export function countOverdueTasks(tasks: Task[], asOf: Date): number {
  return tasks.filter((t) => t.status !== 'done' && new Date(t.dueDate) < asOf).length;
}

export function completionRateAt(tasks: Task[], asOf: Date): number {
  const eligible = tasks.filter((t) => new Date(t.createdAt) <= asOf);
  if (eligible.length === 0) return 0;
  const done = eligible.filter((t) => t.status === 'done' && new Date(t.updatedAt) <= asOf).length;
  return Math.round((done / eligible.length) * 100);
}

export function sumTimeEntriesInPeriod(entries: TimeEntry[], start: Date, end: Date): number {
  return entries.filter((e) => isInPeriod(e.date, start, end)).reduce((sum, e) => sum + e.hours, 0);
}

export function avgSprintVelocityInPeriod(sprints: Sprint[], start: Date, end: Date): number {
  const inPeriod = sprints.filter(
    (s) => (s.status === 'completed' || s.status === 'active') && isInPeriod(s.endDate, start, end)
  );
  if (inPeriod.length === 0) return 0;
  return Math.round(inPeriod.reduce((sum, s) => sum + (s.velocity || 0), 0) / inPeriod.length);
}

export function countActiveProjects(projects: Project[]): number {
  return projects.filter((p) => p.status === 'active').length;
}

export function countProjectsActivatedInPeriod(projects: Project[], start: Date, end: Date): number {
  return projects.filter((p) => p.status === 'active' && isInPeriod(p.updatedAt, start, end)).length;
}

export function countSprintsCompletedInPeriod(sprints: Sprint[], start: Date, end: Date): number {
  return sprints.filter((s) => s.status === 'completed' && isInPeriod(s.endDate, start, end)).length;
}

export function countActiveSprintsCreatedInPeriod(sprints: Sprint[], start: Date, end: Date): number {
  return sprints.filter((s) => s.status === 'active' && isInPeriod(s.createdAt, start, end)).length;
}

export function onTimeDeliveryRate(tasks: Task[]): number {
  const doneTasks = tasks.filter((t) => t.status === 'done');
  if (doneTasks.length === 0) return 0;
  const onTime = doneTasks.filter((t) => new Date(t.updatedAt) <= new Date(t.dueDate)).length;
  return Math.round((onTime / doneTasks.length) * 100);
}

export function onTimeDeliveryRateInPeriod(tasks: Task[], start: Date, end: Date): number {
  const doneInPeriod = tasks.filter((t) => t.status === 'done' && isInPeriod(t.updatedAt, start, end));
  if (doneInPeriod.length === 0) return 0;
  const onTime = doneInPeriod.filter((t) => new Date(t.updatedAt) <= new Date(t.dueDate)).length;
  return Math.round((onTime / doneInPeriod.length) * 100);
}

// ─── Weekly chart data ────────────────────────────────────────────────────────

export function buildWeeklyTaskTrend(tasks: Task[], weeks: number): { name: string; completed: number; created: number }[] {
  const now = new Date();
  const data: { name: string; completed: number; created: number }[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now.getTime() - i * 7 * MS_PER_DAY);
    const weekStart = new Date(weekEnd.getTime() - 7 * MS_PER_DAY);
    const label = `S${String(weeks - i).padStart(2, '0')}`;

    data.push({
      name: label,
      completed: tasks.filter((t) => t.status === 'done' && isInPeriod(t.updatedAt, weekStart, weekEnd)).length,
      created: tasks.filter((t) => isInPeriod(t.createdAt, weekStart, weekEnd)).length,
    });
  }

  return data;
}

export function buildWeeklyTaskTrendReports(tasks: Task[], weeks: number): { name: string; terminees: number; creees: number }[] {
  return buildWeeklyTaskTrend(tasks, weeks).map(({ name, completed, created }) => ({
    name,
    terminees: completed,
    creees: created,
  }));
}

export function buildProjectProgressTrend(projects: Project[], tasks: Task[], weeks: number, locale: string): {
  name: string;
  target: number;
  actual: number;
}[] {
  const now = new Date();
  const labels =
    locale === 'fr'
      ? ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
      : ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
  const slice = weeks <= 6 ? weeks : 6;

  return Array.from({ length: slice }, (_, i) => {
    const weekEnd = new Date(now.getTime() - (slice - 1 - i) * 7 * MS_PER_DAY);
    const weekStart = new Date(weekEnd.getTime() - 7 * MS_PER_DAY);

    const doneInWeek = tasks.filter((t) => t.status === 'done' && isInPeriod(t.updatedAt, weekStart, weekEnd)).length;
    const totalAtWeek = tasks.filter((t) => new Date(t.createdAt) <= weekEnd).length;
    const actual = totalAtWeek > 0 ? Math.round((doneInWeek / totalAtWeek) * 100) : 0;

    const activeProjects = projects.filter((p) => new Date(p.createdAt) <= weekEnd);
    const target =
      activeProjects.length > 0
        ? Math.round(activeProjects.reduce((sum, p) => sum + p.progress, 0) / activeProjects.length)
        : 0;

    return { name: labels[i] ?? `W${i + 1}`, target, actual };
  });
}

export function buildUserWorkload(users: { id: string; name: string }[], tasks: Task[]): {
  name: string;
  taches: number;
  terminees: number;
}[] {
  return users.slice(0, 6).map((user) => {
    const userTasks = tasks.filter((t) => t.assigneeId === user.id);
    return {
      name: user.name.split(' ')[0],
      taches: userTasks.length,
      terminees: userTasks.filter((t) => t.status === 'done').length,
    };
  });
}

export function avgTaskDurationInPeriod(tasks: Task[], start: Date, end: Date): number {
  const doneTasks = tasks.filter(
    (t) => t.status === 'done' && isInPeriod(t.updatedAt, start, end) && t.estimatedHours && t.estimatedHours > 0
  );
  if (doneTasks.length === 0) return 0;
  return Math.round(doneTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) / doneTasks.length);
}
