import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-api';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);

    const tasks = await db.task.findMany({
      where: workspaceId ? { project: { workspaceId } } : undefined,
      include: {
        assignee: true,
        creator: true,
        subtasks: true,
        project: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, status, priority, tags, dueDate, projectId, assigneeId, creatorId, subtasks } = body;

    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || 'medium',
        tags: tags ? tags.join(',') : '',
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        assigneeId: assigneeId || null,
        creatorId: creatorId || null,
        ...(Array.isArray(subtasks) && subtasks.length > 0
          ? {
              subtasks: {
                create: subtasks.map((subtask: { title: string }) => ({
                  title: subtask.title,
                })),
              },
            }
          : {}),
      },
      include: {
        assignee: true,
        subtasks: true,
        project: true,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
