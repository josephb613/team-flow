import { db } from '@/lib/db';
import type { ContextBuilderOptions } from '../types';

function formatDate(date: Date | null | undefined): string {
  if (!date) return 'none';
  return date.toISOString().slice(0, 10);
}

export async function summarizeTasks(options: ContextBuilderOptions): Promise<string> {
  const { workspaceId, projectId, userId } = options;
  const now = new Date();

  const baseWhere = {
    project: {
      workspaceId,
      ...(projectId ? { id: projectId } : {}),
    },
  };

  const [tasks, overdueCount, statusGroups] = await Promise.all([
    db.task.findMany({
      where: baseWhere,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignee: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
      take: 50,
    }),
    db.task.count({
      where: {
        ...baseWhere,
        dueDate: { lt: now },
        status: { notIn: ['done', 'completed', 'cancelled'] },
      },
    }),
    db.task.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { id: true },
    }),
  ]);

  const lines: string[] = [`Total tasks (sample up to 50): ${tasks.length}`];

  if (overdueCount > 0) {
    lines.push(`Overdue tasks: ${overdueCount}`);
  }

  if (statusGroups.length > 0) {
    lines.push(
      'By status: ' +
        statusGroups.map((g) => `${g.status}=${g._count.id}`).join(', ')
    );
  }

  if (userId) {
    const myTasks = await db.task.findMany({
      where: { ...baseWhere, assigneeId: userId },
      select: { title: true, status: true, dueDate: true, priority: true },
      take: 15,
      orderBy: { dueDate: 'asc' },
    });
    if (myTasks.length > 0) {
      lines.push('Assigned to current user:');
      for (const t of myTasks) {
        lines.push(
          `  - [${t.status}] ${t.title} (due: ${formatDate(t.dueDate)}, priority: ${t.priority})`
        );
      }
    } else {
      lines.push('No tasks assigned to current user.');
    }
  }

  const upcoming = tasks
    .filter((t) => t.dueDate && t.dueDate >= now && !['done', 'completed'].includes(t.status))
    .slice(0, 10);

  if (upcoming.length > 0) {
    lines.push('Upcoming deadlines:');
    for (const t of upcoming) {
      lines.push(
        `  - ${t.title} (${t.project.name}) due ${formatDate(t.dueDate)} [${t.status}]`
      );
    }
  }

  return lines.join('\n');
}
