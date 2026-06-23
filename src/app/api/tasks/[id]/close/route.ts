import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { triggerReindex } from '@/lib/ai/embeddings/indexer';
import { appendLessonEntry } from '@/lib/lessons/lessons-readme';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-query';
import { assertTaskInWorkspace, assertUserInWorkspace } from '@/lib/workspace-api';

const MIN_FIELD_LENGTH = 20;

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
    const { resolutionSummary, lessonsLearned, tags, closedById } = body;

    const resolution = String(resolutionSummary ?? '').trim();
    const lessons = String(lessonsLearned ?? '').trim();

    if (resolution.length < MIN_FIELD_LENGTH) {
      return NextResponse.json(
        { error: `resolutionSummary must be at least ${MIN_FIELD_LENGTH} characters` },
        { status: 400 }
      );
    }
    if (lessons.length < MIN_FIELD_LENGTH) {
      return NextResponse.json(
        { error: `lessonsLearned must be at least ${MIN_FIELD_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (closedById) {
      const userAccess = await assertUserInWorkspace(closedById, workspaceId);
      if (!userAccess.ok) return userAccess.response;
    }

    const existing = await db.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, workspaceId: true } },
        closedBy: { select: { name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (existing.status === 'done') {
      return NextResponse.json({ error: 'Task is already closed' }, { status: 400 });
    }

    const tagStr = Array.isArray(tags)
      ? tags.join(',')
      : typeof tags === 'string'
        ? tags
        : existing.tags;

    const now = new Date();

    const task = await db.task.update({
      where: { id },
      data: {
        status: 'done',
        resolutionSummary: resolution,
        lessonsLearned: lessons,
        closedAt: now,
        closedById: closedById || null,
        tags: tagStr,
      },
      include: {
        assignee: true,
        subtasks: true,
        project: true,
        closedBy: { select: { id: true, name: true } },
      },
    });

    const closedByName =
      task.closedBy?.name ??
      (closedById
        ? (await db.user.findUnique({ where: { id: closedById }, select: { name: true } }))?.name
        : null) ??
      '—';

    if (task.project) {
      await appendLessonEntry(task.project.id, {
        taskId: task.id,
        taskTitle: task.title,
        resolutionSummary: resolution,
        lessonsLearned: lessons,
        tags: tagStr ? tagStr.split(',').filter(Boolean) : [],
        closedAt: now,
        closedByName,
      });

      if (workspaceId) {
        const activityUserId = closedById || task.assigneeId || task.creatorId;
        if (activityUserId) {
          await db.activityLog.create({
            data: {
              type: 'task_closed_with_lessons',
              userId: activityUserId,
              description: `Tâche clôturée avec leçons : ${task.title}`,
              targetId: task.id,
              targetType: 'task',
              workspaceId: task.project.workspaceId,
            },
          });
        }
      }

      triggerReindex(task.project.workspaceId, 'task', task.id);
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('POST /api/tasks/[id]/close error:', error);
    return NextResponse.json({ error: 'Failed to close task' }, { status: 500 });
  }
}
