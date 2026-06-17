import { db } from '@/lib/db';
import type { ContextBuilderOptions } from '../types';

function formatDate(date: Date | null | undefined): string {
  if (!date) return 'none';
  return date.toISOString().slice(0, 10);
}

export async function summarizeProjects(options: ContextBuilderOptions): Promise<string> {
  const { workspaceId, projectId } = options;

  const projects = await db.project.findMany({
    where: {
      workspaceId,
      ...(projectId ? { id: projectId } : {}),
      status: { not: 'archived' },
    },
    select: {
      id: true,
      name: true,
      status: true,
      budget: true,
      currency: true,
      startDate: true,
      endDate: true,
      _count: { select: { tasks: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: projectId ? 1 : 15,
  });

  if (projects.length === 0) {
    return 'No active projects in this workspace.';
  }

  const lines = [`Active projects (${projects.length}):`];

  for (const p of projects) {
    lines.push(
      `- ${p.name} [${p.status}] — ${p._count.tasks} tasks, budget: ${p.budget} ${p.currency}, ` +
        `dates: ${formatDate(p.startDate)} → ${formatDate(p.endDate)}`
    );
  }

  return lines.join('\n');
}
