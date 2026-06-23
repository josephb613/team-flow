import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { triggerReindex } from '@/lib/ai/embeddings/indexer';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-query';
import { assertTaskInWorkspace, assertUserInWorkspace } from '@/lib/workspace-api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertTaskInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    const comments = await db.comment.findMany({
      where: { taskId: id },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      comments.map((c) => ({
        id: c.id,
        content: c.content,
        taskId: c.taskId,
        userId: c.userId,
        createdAt: c.createdAt.toISOString(),
        user: c.user,
      }))
    );
  } catch (error) {
    console.error('GET /api/tasks/[id]/comments error:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertTaskInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    const body = await request.json();
    const { content, userId } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const userAccess = await assertUserInWorkspace(String(userId), workspaceId);
    if (!userAccess.ok) return userAccess.response;

    const task = await db.task.findUnique({
      where: { id },
      select: { project: { select: { workspaceId: true } } },
    });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const comment = await db.comment.create({
      data: {
        content: String(content).trim(),
        taskId: id,
        userId: String(userId),
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    if (task.project.workspaceId) {
      triggerReindex(task.project.workspaceId, 'task', id);
    }

    return NextResponse.json(
      {
        id: comment.id,
        content: comment.content,
        taskId: comment.taskId,
        userId: comment.userId,
        createdAt: comment.createdAt.toISOString(),
        user: comment.user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/tasks/[id]/comments error:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
