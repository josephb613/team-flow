import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapUsers } from '@/lib/data-mappers';
import { verifyPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Mot de passe requis' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      include: {
        assignedTasks: { select: { id: true } },
        workspaceMembers: { include: { workspace: { select: { id: true, name: true } } } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 401 });
    }

    if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    const mapped = mapUsers([user])[0];
    const ws = user.workspaceMembers[0]?.workspace;

    return NextResponse.json({
      user: {
        id: mapped.id,
        name: mapped.name,
        email: mapped.email,
        avatar: mapped.avatar,
        role: mapped.role,
        organizationId: ws?.id ?? mapped.organizationId,
        organizationName: ws?.name ?? mapped.organizationName,
      },
    });
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json({ error: 'Échec de connexion' }, { status: 500 });
  }
}
