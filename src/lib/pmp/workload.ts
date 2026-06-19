import { db } from '@/lib/db';

export interface WorkloadEntry {
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
    dueDate: Date | null;
    project: { id: string; name: string; color: string; icon: string };
  }[];
}

export async function getWorkload(workspaceId: string): Promise<WorkloadEntry[]> {
  const users = await db.user.findMany({
    where: { workspaceMembers: { some: { workspaceId } } },
    include: {
      assignedTasks: {
        where: {
          status: { not: 'done' },
          project: { workspaceId },
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          estimatedHours: true,
          dueDate: true,
          project: { select: { id: true, name: true, color: true, icon: true } },
        },
      },
      timeEntries: {
        where: { project: { workspaceId } },
        select: { hours: true, date: true },
      },
    },
  });

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  const workload = users.map((user) => {
    const openHours = user.assignedTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const loggedThisWeek = user.timeEntries
      .filter((e) => e.date >= weekStart)
      .reduce((sum, e) => sum + e.hours, 0);
    const utilization = user.weeklyCapacity > 0 ? (openHours / user.weeklyCapacity) * 100 : 0;

    let level: 'under' | 'optimal' | 'over' = 'optimal';
    if (utilization < 60) level = 'under';
    else if (utilization > 100) level = 'over';

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      weeklyCapacity: user.weeklyCapacity,
      openTaskCount: user.assignedTasks.length,
      openHours,
      loggedThisWeek,
      utilization,
      level,
      tasks: user.assignedTasks,
    };
  });

  workload.sort((a, b) => b.utilization - a.utilization);
  return workload;
}
