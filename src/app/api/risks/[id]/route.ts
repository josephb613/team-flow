import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { triggerReindex } from '@/lib/ai/embeddings/indexer';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-query';
import { assertRiskInWorkspace } from '@/lib/workspace-api';
import {
  buildRiskWriteData,
  formatRiskResponse,
  loadRelatedTasksForRisks,
  validateRiskTaskIds,
} from '@/lib/risk-api';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertRiskInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    const body = await request.json();

    const existing = await db.risk.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Risk not found' }, { status: 404 });
    }

    let validatedTaskIds: string[] | undefined;
    if (body.taskIds !== undefined) {
      validatedTaskIds = await validateRiskTaskIds(body.taskIds, existing.projectId);
    }

    const data = buildRiskWriteData(body, validatedTaskIds);
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const risk = await db.risk.update({
      where: { id },
      data,
      include: { owner: true, project: true },
    });

    const taskMap = await loadRelatedTasksForRisks([risk], risk.projectId);
    const relatedTasks = risk.taskIds
      .split(',')
      .map((taskId) => taskId.trim())
      .filter(Boolean)
      .map((taskId) => taskMap.get(taskId))
      .filter((task): task is { id: string; title: string; status: string } => Boolean(task));

    if (risk.project?.workspaceId) {
      triggerReindex(risk.project.workspaceId, 'risk', risk.id);
    }

    return NextResponse.json(formatRiskResponse(risk, relatedTasks));
  } catch (error) {
    console.error('PATCH /api/risks/[id] error');
    return NextResponse.json({ error: 'Failed to update risk' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertRiskInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    await db.risk.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/risks/[id] error');
    return NextResponse.json({ error: 'Failed to delete risk' }, { status: 500 });
  }
}
