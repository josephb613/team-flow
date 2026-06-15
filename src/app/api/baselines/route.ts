import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  buildProjectScopedWhere,
  getWorkspaceIdFromRequest,
} from '@/lib/workspace-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const workspaceId = getWorkspaceIdFromRequest(request);
    const scopedWhere = buildProjectScopedWhere(workspaceId, projectId);

    const baselines = await db.baseline.findMany({
      where: scopedWhere,
      include: { project: { select: { id: true, name: true, color: true, icon: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(baselines);
  } catch (error) {
    console.error('GET /api/baselines error:', error);
    return NextResponse.json({ error: 'Failed to fetch baselines' }, { status: 500 });
  }
}

// Creates a baseline by snapshotting the project's current state server-side
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, projectId } = body;

    if (!name || !projectId) {
      return NextResponse.json({ error: 'name and projectId are required' }, { status: 400 });
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            startDate: true,
            dueDate: true,
            estimatedHours: true,
          },
        },
        timeEntries: { select: { hours: true, hourlyRate: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const actualCost = project.timeEntries.reduce((sum, e) => sum + e.hours * (e.hourlyRate || project.hourlyRate), 0);
    const totalEstimatedHours = project.tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const doneTasks = project.tasks.filter((t) => t.status === 'done').length;

    const snapshot = {
      capturedAt: new Date().toISOString(),
      budget: project.budget,
      currency: project.currency,
      hourlyRate: project.hourlyRate,
      startDate: project.startDate,
      endDate: project.endDate,
      taskCount: project.tasks.length,
      doneTasks,
      totalEstimatedHours,
      actualCost,
      tasks: project.tasks,
    };

    const baseline = await db.baseline.create({
      data: {
        name,
        type: type || 'integrated',
        snapshot: JSON.stringify(snapshot),
        projectId,
      },
      include: { project: { select: { id: true, name: true, color: true, icon: true } } },
    });

    return NextResponse.json(baseline, { status: 201 });
  } catch (error) {
    console.error('POST /api/baselines error:', error);
    return NextResponse.json({ error: 'Failed to create baseline' }, { status: 500 });
  }
}
