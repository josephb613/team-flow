import { NextRequest, NextResponse } from 'next/server';
import { indexWorkspace } from '@/lib/ai/embeddings/indexer';
import { validateWorkspace } from '@/lib/ai/context/context-builder';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId } = body as { workspaceId?: string };

    if (!workspaceId || typeof workspaceId !== 'string') {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    await validateWorkspace(workspaceId);
    const result = await indexWorkspace(workspaceId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('POST /api/ai/index error:', error);

    const message = error instanceof Error ? error.message : 'Indexing failed';
    const status = message === 'Workspace not found' ? 404 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
