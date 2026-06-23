import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { triggerReindex } from '@/lib/ai/embeddings/indexer';
import { buildWikiTree, formatWikiPage } from '@/lib/wiki-api';
import {
  assertProjectInWorkspace,
  getWorkspaceIdFromRequest,
} from '@/lib/workspace-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = getWorkspaceIdFromRequest(request);
    const kind = searchParams.get('kind');
    const projectId = searchParams.get('projectId');
    const tree = searchParams.get('tree') === 'true';

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const pages = await db.wikiPage.findMany({
      where: {
        workspaceId,
        ...(kind ? { kind } : {}),
        ...(projectId ? { projectId } : {}),
      },
      include: {
        editor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { title: 'asc' },
    });

    const formatted = pages.map(formatWikiPage);

    if (tree) {
      return NextResponse.json(buildWikiTree(formatted));
    }

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('GET /api/wiki error:', error);
    return NextResponse.json({ error: 'Failed to fetch wiki pages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const body = await request.json();
    const { title, content, icon, parentId, kind, projectId, lastEditedBy } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (kind === 'lessons_index') {
      return NextResponse.json(
        { error: 'Lessons index pages are created automatically per project' },
        { status: 400 }
      );
    }

    if (projectId) {
      const projectAccess = await assertProjectInWorkspace(projectId, workspaceId);
      if (!projectAccess.ok) return projectAccess.response;
    }

    if (parentId) {
      const parent = await db.wikiPage.findFirst({
        where: { id: parentId, workspaceId },
      });
      if (!parent) {
        return NextResponse.json({ error: 'Parent page not found' }, { status: 404 });
      }
    }

    const page = await db.wikiPage.create({
      data: {
        title: String(title).trim(),
        content: content?.trim() ?? '',
        icon: icon?.trim() || '📄',
        kind: kind === 'lessons_index' ? 'lessons_index' : 'page',
        parentId: parentId || null,
        projectId: projectId || null,
        workspaceId,
        lastEditedBy: lastEditedBy || null,
      },
      include: {
        editor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, icon: true } },
      },
    });

    triggerReindex(workspaceId, 'wiki_page', page.id);

    return NextResponse.json(formatWikiPage(page), { status: 201 });
  } catch (error) {
    console.error('POST /api/wiki error:', error);
    return NextResponse.json({ error: 'Failed to create wiki page' }, { status: 500 });
  }
}
