import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireApiWorkspaceAuth } from '@/lib/auth/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiWorkspaceAuth(request);
    if (!auth.ok) return auth.response;

    const users = await db.user.findMany({
      where: { workspaceMembers: { some: { workspaceId: auth.workspaceId } } },
      include: {
        workspaceMembers: {
          where: { workspaceId: auth.workspaceId },
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
    const auth = await requireApiWorkspaceAuth(request);
    if (!auth.ok) return auth.response;

    const member = await db.workspaceMember.findFirst({
      where: { workspaceId: auth.workspaceId, userId: auth.appUser.id, role: 'admin' },
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, role } = body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const user = await db.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: typeof name === 'string' ? name.trim() : email.split('@')[0],
        role: role || 'member',
        workspaceMembers: {
          create: {
            workspaceId: auth.workspaceId,
            role: 'member',
          },
        },
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
