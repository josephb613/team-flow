import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { triggerReindex } from '@/lib/ai/embeddings/indexer';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-query';
import { assertChangeRequestInWorkspace } from '@/lib/workspace-api';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertChangeRequestInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    const body = await request.json();
    const { title, description, priority, status, impactScope, impactDays, impactCost, decision } = body;

    const statusChangesDecision = status === 'approved' || status === 'rejected';

    const changeRequest = await db.changeRequest.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status }),
        ...(impactScope !== undefined && { impactScope }),
        ...(impactDays !== undefined && { impactDays }),
        ...(impactCost !== undefined && { impactCost }),
        ...(decision !== undefined && { decision }),
        ...(statusChangesDecision && { decidedAt: new Date() }),
      },
      include: { requestedBy: true, project: true },
    });

    if (changeRequest.project?.workspaceId) {
      triggerReindex(changeRequest.project.workspaceId, 'change_request', changeRequest.id);
    }

    return NextResponse.json(changeRequest);
  } catch (error) {
    console.error('PATCH /api/change-requests/[id] error');
    return NextResponse.json({ error: 'Failed to update change request' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertChangeRequestInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    await db.changeRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/change-requests/[id] error');
    return NextResponse.json({ error: 'Failed to delete change request' }, { status: 500 });
  }
}
