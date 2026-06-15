import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  buildProjectScopedWhere,
  getWorkspaceIdFromRequest,
} from '@/lib/workspace-query';
import {
  clampRiskRating,
  formatRiskResponse,
  loadRelatedTasksForRisks,
  validateRiskTaskIds,
} from '@/lib/risk-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const workspaceId = getWorkspaceIdFromRequest(request);
    const minScore = Number(searchParams.get('minScore') || 0);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const scopedWhere = buildProjectScopedWhere(workspaceId, projectId);

    const risks = await db.risk.findMany({
      where: {
        ...(scopedWhere ?? {}),
        ...(activeOnly ? { status: { in: ['open', 'mitigating'] } } : {}),
      },
      include: { owner: true, project: true },
      orderBy: { createdAt: 'desc' },
    });

    const taskMap = await loadRelatedTasksForRisks(risks, projectId);
    let formatted = risks.map((risk) => {
      const relatedTasks = parseRelatedTasks(risk.taskIds, taskMap);
      return formatRiskResponse(risk, relatedTasks);
    });

    if (minScore > 0) {
      formatted = formatted.filter((risk) => risk.score >= minScore);
    }

    formatted.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('GET /api/risks error:', error);
    return NextResponse.json({ error: 'Failed to fetch risks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, projectId } = body;

    if (!title || !projectId) {
      return NextResponse.json({ error: 'title and projectId are required' }, { status: 400 });
    }

    const validatedTaskIds = await validateRiskTaskIds(body.taskIds, projectId);

    const risk = await db.risk.create({
      data: {
        title,
        description: body.description || null,
        category: body.category || 'technical',
        probability: clampRiskRating(body.probability),
        impact: clampRiskRating(body.impact),
        status: body.status || 'open',
        response: body.response || 'mitigate',
        mitigationPlan: body.mitigationPlan || null,
        ownerId: body.ownerId || null,
        projectId,
        taskIds: validatedTaskIds.join(','),
      },
      include: { owner: true, project: true },
    });

    const taskMap = await loadRelatedTasksForRisks([risk], projectId);
    const relatedTasks = parseRelatedTasks(risk.taskIds, taskMap);

    return NextResponse.json(formatRiskResponse(risk, relatedTasks), { status: 201 });
  } catch (error) {
    console.error('POST /api/risks error:', error);
    return NextResponse.json({ error: 'Failed to create risk' }, { status: 500 });
  }
}

function parseRelatedTasks(
  taskIdsRaw: string,
  taskMap: Map<string, { id: string; title: string; status: string }>
) {
  return taskIdsRaw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => taskMap.get(id))
    .filter((task): task is { id: string; title: string; status: string } => Boolean(task));
}
