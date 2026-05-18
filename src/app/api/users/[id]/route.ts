import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await db.userProfile.findUnique({
      where: { neonAuthUserId: id },
      include: {
        assignedTasks: true,
        createdTasks: true,
        comments: true,
        messages: true,
        uploadedFiles: true,
        workspaceMembers: {
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
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ id: user.neonAuthUserId, ...user });
  } catch (error) {
    console.error('GET /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, avatar, role, status } = body;

    const user = await db.userProfile.update({
      where: { neonAuthUserId: id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(avatar !== undefined && { avatar }),
        ...(role !== undefined && { role }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json({ id: user.neonAuthUserId, ...user });
  } catch (error) {
    console.error('PATCH /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.userProfile.findUnique({ where: { neonAuthUserId: id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.userProfile.delete({ where: { neonAuthUserId: id } });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
