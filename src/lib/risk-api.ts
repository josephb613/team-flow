import { db } from '@/lib/db';
import {
  clampRiskRating,
  getRiskScore,
  isActiveRiskStatus,
  isAlertRisk,
  parseTaskIds,
  serializeTaskIds,
} from '@/lib/risk-utils';

type RiskRecord = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  probability: number;
  impact: number;
  status: string;
  response: string;
  mitigationPlan: string | null;
  taskIds: string;
  ownerId: string | null;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  owner?: { id: string; name: string } | null;
  project?: { id: string; name: string; icon: string } | null;
};

type RelatedTask = { id: string; title: string; status: string };

export function formatRiskResponse(
  risk: RiskRecord,
  relatedTasks: RelatedTask[] = []
) {
  const taskIds = parseTaskIds(risk.taskIds);
  const score = getRiskScore(risk.probability, risk.impact);

  return {
    ...risk,
    taskIds,
    score,
    relatedTasks,
    isAlert: isAlertRisk(risk),
  };
}

export async function loadRelatedTasksForRisks(
  risks: RiskRecord[],
  projectId?: string | null
): Promise<Map<string, RelatedTask>> {
  const allTaskIds = [...new Set(risks.flatMap((risk) => parseTaskIds(risk.taskIds)))];
  if (allTaskIds.length === 0) return new Map();

  const tasks = await db.task.findMany({
    where: {
      id: { in: allTaskIds },
      ...(projectId ? { projectId } : {}),
    },
    select: { id: true, title: true, status: true },
  });

  return new Map(tasks.map((task) => [task.id, task]));
}

export async function validateRiskTaskIds(taskIds: unknown, projectId: string): Promise<string[]> {
  const ids = parseTaskIds(serializeTaskIds(taskIds));
  if (ids.length === 0) return [];

  const validTasks = await db.task.findMany({
    where: { id: { in: ids }, projectId },
    select: { id: true },
  });

  const validIds = new Set(validTasks.map((task) => task.id));
  return ids.filter((id) => validIds.has(id));
}

export function buildRiskWriteData(body: Record<string, unknown>, validatedTaskIds?: string[]) {
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.category !== undefined) data.category = body.category;
  if (body.probability !== undefined) data.probability = clampRiskRating(body.probability);
  if (body.impact !== undefined) data.impact = clampRiskRating(body.impact);
  if (body.status !== undefined) data.status = body.status;
  if (body.response !== undefined) data.response = body.response;
  if (body.mitigationPlan !== undefined) data.mitigationPlan = body.mitigationPlan || null;
  if (body.ownerId !== undefined) data.ownerId = body.ownerId || null;
  if (validatedTaskIds !== undefined) data.taskIds = serializeTaskIds(validatedTaskIds);

  return data;
}

export { clampRiskRating, getRiskScore, isActiveRiskStatus, isAlertRisk, parseTaskIds, serializeTaskIds };
