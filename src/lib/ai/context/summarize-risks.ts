import { db } from '@/lib/db';
import type { ContextBuilderOptions } from '../types';

export async function summarizeRisks(options: ContextBuilderOptions): Promise<string> {
  const { workspaceId, projectId } = options;

  const risks = await db.risk.findMany({
    where: {
      status: { in: ['open', 'mitigating'] },
      project: {
        workspaceId,
        ...(projectId ? { id: projectId } : {}),
      },
    },
    select: {
      title: true,
      category: true,
      probability: true,
      impact: true,
      status: true,
      response: true,
      project: { select: { name: true } },
    },
    orderBy: [{ probability: 'desc' }, { impact: 'desc' }],
    take: 10,
  });

  if (risks.length === 0) {
    return 'No open risks.';
  }

  const lines = [`Top risks by score (${risks.length}):`];

  for (const r of risks) {
    const score = r.probability * r.impact;
    lines.push(
      `- [score ${score}] ${r.title} (${r.project.name}) — ${r.category}, ` +
        `P=${r.probability} I=${r.impact}, ${r.status}, response: ${r.response}`
    );
  }

  return lines.join('\n');
}
