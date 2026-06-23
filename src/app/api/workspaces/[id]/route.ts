import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-query';
import { assertWorkspaceMembership } from '@/lib/workspace-api';
import { requireApiAuth } from '@/lib/auth/api-auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const workspaceId = getWorkspaceIdFromRequest(request) ?? id;
    const access = await assertWorkspaceMembership(workspaceId, auth.appUser.id);
    if (!access.ok) return access.response;

    if (workspaceId !== id) {
      return NextResponse.json({ error: 'Workspace mismatch' }, { status: 400 });
    }

    const body = await request.json();
    const { name, slug, description, logo } = body;

    const existing = await db.workspace.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const data: {
      name?: string;
      slug?: string;
      description?: string | null;
      logo?: string | null;
    } = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }
      data.name = trimmed;
    }

    if (slug !== undefined) {
      const trimmed = String(slug).trim();
      const finalSlug = trimmed || slugify(data.name ?? existing.name);
      const conflict = await db.workspace.findFirst({
        where: { slug: finalSlug, NOT: { id } },
      });
      if (conflict) {
        return NextResponse.json({ error: 'This URL is already in use' }, { status: 409 });
      }
      data.slug = finalSlug;
    }

    if (description !== undefined) {
      data.description = String(description).trim() || null;
    }

    if (logo !== undefined) {
      data.logo = logo?.trim() || null;
    }

    const workspace = await db.workspace.update({
      where: { id },
      data,
      include: {
        members: { select: { userId: true } },
        projects: { select: { id: true } },
      },
    });

    return NextResponse.json(workspace);
  } catch (error) {
    console.error('PATCH /api/workspaces/[id] error');
    return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 });
  }
}
