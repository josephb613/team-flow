import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { syncAppUser } from '@/lib/sync-app-user';

export async function POST(request: Request) {
  try {
    const { data: session } = await auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const workspaceName =
      typeof body.workspaceName === 'string' ? body.workspaceName.trim() : undefined;

    const user = await syncAppUser({
      neonAuthUserId: session.user.id,
      email: session.user.email,
      name: session.user.name ?? session.user.email.split('@')[0],
      workspaceName,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('POST /api/auth/sync error:', error);
    return NextResponse.json({ error: 'Échec de synchronisation du compte' }, { status: 500 });
  }
}
