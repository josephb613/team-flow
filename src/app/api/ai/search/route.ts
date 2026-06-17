import { NextRequest, NextResponse } from 'next/server';
import { validateWorkspace } from '@/lib/ai/context/context-builder';
import { semanticSearch } from '@/lib/ai/embeddings/semantic-retriever';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    const q = request.nextUrl.searchParams.get('q');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(Number(limitParam), 1), 50) : 8;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ error: 'q is required' }, { status: 400 });
    }

    await validateWorkspace(workspaceId);
    const results = await semanticSearch(workspaceId, q, limit);

    return NextResponse.json({
      workspaceId,
      query: q,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('GET /api/ai/search error:', error);

    const message = error instanceof Error ? error.message : 'Search failed';
    const status = message === 'Workspace not found' ? 404 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
