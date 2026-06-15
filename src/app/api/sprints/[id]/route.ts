import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  assertSprintInWorkspace,
  getWorkspaceIdFromRequest,
} from '@/lib/workspace-api';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertSprintInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    const body = await request.json();
    const { name, goal, status, startDate, endDate } = body;

    const sprint = await db.sprint.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(goal !== undefined && { goal }),
        ...(status !== undefined && { status }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    });

    return NextResponse.json(sprint);
  } catch (error) {
    console.error('PATCH /api/sprints/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update sprint' }, { status: 500 });
  }
}
