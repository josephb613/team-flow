import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { triggerReindex } from '@/lib/ai/embeddings/indexer';
import {
  assertProjectInWorkspace,
  getWorkspaceIdFromRequest,
} from '@/lib/workspace-api';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertProjectInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    const project = await db.project.findUnique({
      where: { id },
      include: {
        workspace: true,
        tasks: { include: { assignee: true } },
        risks: true,
        stakeholders: true,
        changeRequests: true,
        baselines: true,
      },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    console.error('GET /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertProjectInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    const body = await request.json();
    const { name, description, color, icon, status, budget, currency, hourlyRate, startDate, endDate } = body;

    const project = await db.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(status !== undefined && { status }),
        ...(budget !== undefined && { budget }),
        ...(currency !== undefined && { currency }),
        ...(hourlyRate !== undefined && { hourlyRate }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    });

    if (description !== undefined) {
      triggerReindex(project.workspaceId, 'project', project.id);
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('PATCH /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertProjectInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    await db.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
