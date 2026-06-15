import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
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

export async function GET() {
  try {
    const workspaces = await db.workspace.findMany({
      include: {
        members: {
          include: {
            user: true,
          },
        },
        projects: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(workspaces);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, description, color, icon, logo, userId } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const baseSlug = slug?.trim() || slugify(String(name));
    const finalSlug = await uniqueSlug(baseSlug);

    const workspace = await db.workspace.create({
      data: {
        name: String(name).trim(),
        slug: finalSlug,
        description: description?.trim() || null,
        color: color || '#10b981',
        icon: icon || '🏢',
        logo: logo?.trim() || null,
        ...(userId
          ? {
              members: {
                create: {
                  userId: String(userId),
                  role: 'admin',
                },
              },
            }
          : {}),
      },
      include: {
        members: { select: { userId: true } },
        projects: { select: { id: true } },
      },
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error('POST /api/workspaces error:', error);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
}
