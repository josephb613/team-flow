import { db } from '@/lib/db';
import type { ContextBuilderOptions } from '../types';

function formatDate(date: Date | null | undefined): string {
  if (!date) return 'none';
  return date.toISOString().slice(0, 10);
}

export async function summarizeSprints(options: ContextBuilderOptions): Promise<string> {
  const { workspaceId, projectId } = options;

  const sprints = await db.sprint.findMany({
    where: {
      status: { in: ['active', 'planning', 'in_progress'] },
      project: {
        workspaceId,
        ...(projectId ? { id: projectId } : {}),
      },
    },
    select: {
      name: true,
      status: true,
      goal: true,
      startDate: true,
      endDate: true,
      velocity: true,
      project: { select: { name: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  if (sprints.length === 0) {
    return 'No active sprints.';
  }

  const lines = [`Active sprints (${sprints.length}):`];

  for (const s of sprints) {
    lines.push(
      `- ${s.name} (${s.project.name}) [${s.status}] — ${s._count.tasks} tasks, ` +
        `${formatDate(s.startDate)} → ${formatDate(s.endDate)}` +
        (s.goal ? `, goal: ${s.goal}` : '') +
        (s.velocity != null ? `, velocity: ${s.velocity}` : '')
    );
  }

  return lines.join('\n');
}
