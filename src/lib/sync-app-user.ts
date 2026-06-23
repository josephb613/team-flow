import { db } from '@/lib/db';
import { mapUsers } from '@/lib/data-mappers';
import { slugify } from '@/lib/utils';

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;

  while (await db.workspace.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }

  return slug;
}

const userInclude = {
  assignedTasks: { select: { id: true } },
  workspaceMembers: {
    orderBy: { joinedAt: 'asc' },
    include: { workspace: { select: { id: true, name: true } } },
  },
} as const;

export type AppAuthUser = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  organizationId: string;
  organizationName: string;
};

export async function syncAppUser(params: {
  neonAuthUserId: string;
  email: string;
  name: string;
  workspaceName?: string;
}): Promise<AppAuthUser> {
  const email = params.email.trim().toLowerCase();
  const displayName = params.name.trim() || email.split('@')[0];

  let user = params.neonAuthUserId
    ? await db.user.findUnique({
        where: { neonAuthUserId: params.neonAuthUserId },
        include: userInclude,
      })
    : null;

  if (!user) {
    user = await db.user.findFirst({
      where: { email, neonAuthUserId: null },
      include: userInclude,
    });
  }

  if (user) {
    const updates: { neonAuthUserId?: string; name?: string } = {};

    if (!user.neonAuthUserId) {
      updates.neonAuthUserId = params.neonAuthUserId;
    }
    if (displayName && user.name !== displayName) {
      updates.name = displayName;
    }

    if (Object.keys(updates).length > 0) {
      user = await db.user.update({
        where: { id: user.id },
        data: updates,
        include: userInclude,
      });
    }
  } else {
    const workspaceLabel = (params.workspaceName?.trim() || displayName).trim();
    const slug = await uniqueSlug(slugify(workspaceLabel) || slugify(displayName) || 'workspace');

    user = await db.user.create({
      data: {
        email,
        name: displayName,
        neonAuthUserId: params.neonAuthUserId,
        role: 'member',
        status: 'online',
        workspaceMembers: {
          create: {
            role: 'admin',
            workspace: {
              create: {
                name: workspaceLabel,
                slug,
                color: '#3b82f6',
                icon: '🏢',
              },
            },
          },
        },
      },
      include: userInclude,
    });
  }

  const mapped = mapUsers([user])[0];
  const ws = user.workspaceMembers[0]?.workspace;

  return {
    id: mapped.id,
    name: mapped.name,
    email: mapped.email,
    avatar: mapped.avatar,
    role: mapped.role,
    organizationId: ws?.id ?? mapped.organizationId,
    organizationName: ws?.name ?? params.workspaceName ?? mapped.organizationName,
  };
}
