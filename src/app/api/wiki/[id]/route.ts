import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { triggerReindex } from '@/lib/ai/embeddings/indexer';
import { formatWikiPage } from '@/lib/wiki-api';
import {
  assertWikiPageInWorkspace,
  getWorkspaceIdFromRequest,
} from '@/lib/workspace-api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertWikiPageInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    const page = await db.wikiPage.findUnique({
      where: { id },
      include: {
        editor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, icon: true } },
      },
    });

    if (!page) {
      return NextResponse.json({ error: 'Wiki page not found' }, { status: 404 });
    }

    const children = await db.wikiPage.findMany({
      where: { parentId: id },
      include: {
        editor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { title: 'asc' },
    });

    return NextResponse.json({
      ...formatWikiPage(page),
      children: children.map(formatWikiPage),
    });
  } catch (error) {
    console.error('GET /api/wiki/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch wiki page' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertWikiPageInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    const existing = await db.wikiPage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Wiki page not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, content, icon, parentId, lastEditedBy } = body;

    if (parentId !== undefined && parentId !== null) {
      if (parentId === id) {
        return NextResponse.json({ error: 'Page cannot be its own parent' }, { status: 400 });
      }
      const parent = await db.wikiPage.findFirst({
        where: { id: parentId, workspaceId: existing.workspaceId },
      });
      if (!parent) {
        return NextResponse.json({ error: 'Parent page not found' }, { status: 404 });
      }
    }

    const page = await db.wikiPage.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(content !== undefined && { content: String(content) }),
        ...(icon !== undefined && { icon: String(icon).trim() || '📄' }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(lastEditedBy !== undefined && { lastEditedBy: lastEditedBy || null }),
      },
      include: {
        editor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, icon: true } },
      },
    });

    triggerReindex(existing.workspaceId, 'wiki_page', page.id);

    return NextResponse.json(formatWikiPage(page));
  } catch (error) {
    console.error('PATCH /api/wiki/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update wiki page' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = getWorkspaceIdFromRequest(request);
    const access = await assertWikiPageInWorkspace(id, workspaceId);
    if (!access.ok) return access.response;

    const existing = await db.wikiPage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Wiki page not found' }, { status: 404 });
    }

    if (existing.kind === 'lessons_index') {
      return NextResponse.json(
        { error: 'Lessons index pages cannot be deleted' },
        { status: 400 }
      );
    }

    const childCount = await db.wikiPage.count({ where: { parentId: id } });
    if (childCount > 0) {
      return NextResponse.json(
        { error: 'Delete child pages first' },
        { status: 400 }
      );
    }

    await db.wikiPage.delete({ where: { id } });
    triggerReindex(existing.workspaceId, 'wiki_page', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/wiki/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete wiki page' }, { status: 500 });
  }
}
