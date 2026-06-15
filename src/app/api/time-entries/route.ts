import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const taskId = searchParams.get('taskId');
    const workspaceId = getWorkspaceIdFromRequest(request);

    const entries = await db.timeEntry.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(taskId ? { taskId } : {}),
        ...(workspaceId && !projectId && !taskId ? { project: { workspaceId } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(entries);
  } catch (error) {
    console.error('GET /api/time-entries error:', error);
    return NextResponse.json({ error: 'Failed to fetch time entries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, userId, date, hours, description, billable, hourlyRate } = body;

    if (!taskId || hours === undefined) {
      return NextResponse.json({ error: 'taskId and hours are required' }, { status: 400 });
    }

    const task = await db.task.findUnique({ where: { id: taskId }, include: { project: true } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const entry = await db.timeEntry.create({
      data: {
        taskId,
        projectId: task.projectId,
        userId: userId || null,
        date: date ? new Date(date) : new Date(),
        hours,
        description: description || null,
        billable: billable ?? true,
        hourlyRate: hourlyRate ?? task.project.hourlyRate,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('POST /api/time-entries error:', error);
    return NextResponse.json({ error: 'Failed to create time entry' }, { status: 500 });
  }
}
