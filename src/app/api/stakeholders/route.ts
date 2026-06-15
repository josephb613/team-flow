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

    const stakeholders = await db.stakeholder.findMany({
      where: scopedWhere,
      include: { project: true },
      orderBy: [{ influence: 'desc' }, { interest: 'desc' }],
    });
    return NextResponse.json(stakeholders);
  } catch (error) {
    console.error('GET /api/stakeholders error:', error);
    return NextResponse.json({ error: 'Failed to fetch stakeholders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, organization, role, email, phone, website, logo, influence, interest, engagement, strategy, projectId } = body;

    if (!name || !projectId) {
      return NextResponse.json({ error: 'name and projectId are required' }, { status: 400 });
    }

    const stakeholder = await db.stakeholder.create({
      data: {
        name,
        organization: organization || null,
        role: role || null,
        email: email || null,
        phone: phone || null,
        website: website?.trim() || null,
        logo: logo?.trim() || null,
        influence: influence ?? 3,
        interest: interest ?? 3,
        engagement: engagement || 'neutral',
        strategy: strategy || null,
        projectId,
      },
      include: { project: true },
    });

    return NextResponse.json(stakeholder, { status: 201 });
  } catch (error) {
    console.error('POST /api/stakeholders error:', error);
    return NextResponse.json({ error: 'Failed to create stakeholder' }, { status: 500 });
  }
}
