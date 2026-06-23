import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-query';
import { assertTaskDependencyInWorkspace } from '@/lib/workspace-api';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertTaskDependencyInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    await db.taskDependency.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/dependencies/[id] error');
    return NextResponse.json({ error: 'Failed to delete dependency' }, { status: 500 });
  }
}
