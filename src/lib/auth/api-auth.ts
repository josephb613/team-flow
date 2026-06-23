import 'server-only';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-query';

export type ApiAuthSuccess = {
  ok: true;
  neonUserId: string;
  email: string;
  appUser: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
};

export type ApiAuthFailure = {
  ok: false;
  response: NextResponse;
};

export async function requireApiAuth(): Promise<ApiAuthSuccess | ApiAuthFailure> {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const appUser = await db.user.findFirst({
    where: { neonAuthUserId: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!appUser) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Account not synced. Please sign in again.' },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    neonUserId: session.user.id,
    email: session.user.email,
    appUser,
  };
}

export async function requireWorkspaceMembership(
  userId: string,
  workspaceId: string | null
): Promise<{ ok: true } | ApiAuthFailure> {
  if (!workspaceId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'workspaceId is required' }, { status: 400 }),
    };
  }

  const member = await db.workspaceMember.findFirst({
    where: { userId, workspaceId },
    select: { id: true, role: true },
  });

  if (!member) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true };
}

export async function requireApiWorkspaceAuth(
  request: Request
): Promise<
  | (ApiAuthSuccess & { workspaceId: string })
  | ApiAuthFailure
> {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult;

  const workspaceId = getWorkspaceIdFromRequest(request);
  const membership = await requireWorkspaceMembership(authResult.appUser.id, workspaceId);
  if (!membership.ok) return membership;

  return {
    ...authResult,
    workspaceId: workspaceId!,
  };
}

export async function requireApiWorkspaceAuthFromBody(
  request: Request,
  body: { workspaceId?: unknown }
): Promise<
  | (ApiAuthSuccess & { workspaceId: string })
  | ApiAuthFailure
> {
  const authResult = await requireApiAuth();
  if (!authResult.ok) return authResult;

  const workspaceId =
    typeof body.workspaceId === 'string' ? body.workspaceId.trim() : null;

  const membership = await requireWorkspaceMembership(authResult.appUser.id, workspaceId);
  if (!membership.ok) return membership;

  return {
    ...authResult,
    workspaceId: workspaceId!,
  };
}
