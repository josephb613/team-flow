import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-api';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);

    const users = await db.user.findMany({
      where: workspaceId
        ? { workspaceMembers: { some: { workspaceId } } }
        : undefined,
      include: {
        workspaceMembers: {
          where: workspaceId ? { workspaceId } : undefined,
          include: {
            workspace: true,
          },
        },
        teamMembers: {
          include: {
            team: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, role } = body;

    const user = await db.user.create({
      data: {
        email,
        name,
        role: role || 'member',
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
