import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  assertUserInWorkspace,
  getWorkspaceIdFromRequest,
} from '@/lib/workspace-api';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertUserInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    const body = await request.json();
    const { weeklyCapacity } = body;

    if (weeklyCapacity !== undefined) {
      const value = Number(weeklyCapacity);
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json(
          { error: 'weeklyCapacity must be a non-negative number' },
          { status: 400 }
        );
      }
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...(weeklyCapacity !== undefined && { weeklyCapacity: Number(weeklyCapacity) }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        weeklyCapacity: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('PATCH /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
