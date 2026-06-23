import { db } from '@/lib/db';
import type { ContextBuilderOptions } from '../types';

export async function summarizeStakeholders(options: ContextBuilderOptions): Promise<string> {
  const { workspaceId, projectId } = options;

  const stakeholders = await db.stakeholder.findMany({
    where: {
      project: {
        workspaceId,
        ...(projectId ? { id: projectId } : {}),
      },
    },
    select: {
      name: true,
      organization: true,
      role: true,
      influence: true,
      interest: true,
      engagement: true,
      project: { select: { name: true } },
    },
    orderBy: [{ influence: 'desc' }, { interest: 'desc' }],
    take: 10,
  });

  if (stakeholders.length === 0) {
    return 'No stakeholders registered.';
  }

  const lines = [`Top stakeholders by influence (${stakeholders.length}):`];

  for (const s of stakeholders) {
    const org = s.organization ? ` (${s.organization})` : '';
    const role = s.role ? `, ${s.role}` : '';
    lines.push(
      `- ${s.name}${org}${role} — ${s.project.name}, ` +
        `influence=${s.influence} interest=${s.interest}, engagement: ${s.engagement}`
    );
  }

  return lines.join('\n');
}
