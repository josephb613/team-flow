import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-query';
import { assertTaskInWorkspace, assertUserInWorkspace } from '@/lib/workspace-api';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertTaskInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    const task = await db.task.findUnique({
      where: { id },
      include: {
        assignee: true,
        creator: true,
        subtasks: true,
        project: true,
        predecessors: { include: { predecessor: { select: { id: true, title: true, status: true } } } },
        successors: { include: { successor: { select: { id: true, title: true, status: true } } } },
        timeEntries: true,
      },
    });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error) {
    console.error('GET /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertTaskInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    const body = await request.json();
    const { title, description, status, priority, tags, dueDate, startDate, estimatedHours, assigneeId, projectId } = body;

    if (assigneeId !== undefined && assigneeId !== null) {
      const assigneeAccess = await assertUserInWorkspace(assigneeId, workspaceId);
      if (!assigneeAccess.ok) return assigneeAccess.response;
    }

    const task = await db.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(tags !== undefined && { tags: Array.isArray(tags) ? tags.join(',') : tags }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(estimatedHours !== undefined && { estimatedHours }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(projectId !== undefined && { projectId }),
      },
      include: { assignee: true, subtasks: true, project: true },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('PATCH /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertTaskInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    await db.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
