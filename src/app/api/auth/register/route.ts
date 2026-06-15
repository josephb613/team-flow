import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapUsers } from '@/lib/data-mappers';
import { hashPassword } from '@/lib/auth';
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const name = String(body.name ?? '').trim();
    const workspaceName = String(body.workspaceName ?? name).trim() || name;

    if (!email || !name) {
      return NextResponse.json({ error: 'Nom et e-mail requis' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Cet e-mail est déjà utilisé' }, { status: 409 });
    }

    const slug = await uniqueSlug(slugify(workspaceName) || slugify(name) || 'workspace');

    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash: hashPassword(password),
        role: 'admin',
        status: 'online',
        workspaceMembers: {
          create: {
            role: 'admin',
            workspace: {
              create: {
                name: workspaceName,
                slug,
                color: '#3b82f6',
                icon: '🏢',
              },
            },
          },
        },
      },
      include: {
        assignedTasks: { select: { id: true } },
        workspaceMembers: { include: { workspace: { select: { id: true, name: true } } } },
      },
    });

    const mapped = mapUsers([user])[0];
    const ws = user.workspaceMembers[0]?.workspace;

    return NextResponse.json(
      {
        user: {
          id: mapped.id,
          name: mapped.name,
          email: mapped.email,
          avatar: mapped.avatar,
          role: mapped.role,
          organizationId: ws?.id ?? '',
          organizationName: ws?.name ?? workspaceName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/auth/register error:', error);
    return NextResponse.json({ error: 'Échec de la création du compte' }, { status: 500 });
  }
}
