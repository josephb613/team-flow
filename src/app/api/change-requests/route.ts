import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { triggerReindex } from '@/lib/ai/embeddings/indexer';
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

    const changeRequests = await db.changeRequest.findMany({
      where: scopedWhere,
      include: { requestedBy: true, project: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(changeRequests);
  } catch (error) {
    console.error('GET /api/change-requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch change requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, priority, impactScope, impactDays, impactCost, requestedById, projectId } = body;

    if (!title || !projectId) {
      return NextResponse.json({ error: 'title and projectId are required' }, { status: 400 });
    }

    const changeRequest = await db.changeRequest.create({
      data: {
        title,
        description: description || null,
        priority: priority || 'medium',
        impactScope: impactScope || null,
        impactDays: impactDays ?? 0,
        impactCost: impactCost ?? 0,
        requestedById: requestedById || null,
        projectId,
      },
      include: { requestedBy: true, project: true },
    });

    if (changeRequest.project?.workspaceId) {
      triggerReindex(changeRequest.project.workspaceId, 'change_request', changeRequest.id);
    }

    return NextResponse.json(changeRequest, { status: 201 });
  } catch (error) {
    console.error('POST /api/change-requests error:', error);
    return NextResponse.json({ error: 'Failed to create change request' }, { status: 500 });
  }
}
