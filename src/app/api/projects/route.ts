import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { triggerReindex } from '@/lib/ai/embeddings/indexer';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-api';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);

    const projects = await db.project.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      include: {
        workspace: true,
        tasks: {
          include: {
            assignee: true,
          },
        },
        meetings: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, color, icon, workspaceId } = body;

    const project = await db.project.create({
      data: {
        name,
        description: description || null,
        color: color || '#3b82f6',
        icon: icon || '📋',
        workspaceId,
      },
    });

    if (description && workspaceId) {
      triggerReindex(workspaceId, 'project', project.id);
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
