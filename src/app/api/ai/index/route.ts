import { NextRequest, NextResponse } from 'next/server';
import { indexWorkspace } from '@/lib/ai/embeddings/indexer';
import { enforceAiRouteAccess } from '@/lib/ai/ai-route-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const access = await enforceAiRouteAccess(request, body);
    if (!access.ok) return access.response;

    const result = await indexWorkspace(access.workspaceId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('POST /api/ai/index error');

    const message = error instanceof Error ? error.message : 'Indexing failed';
    const status = message === 'Workspace not found' ? 404 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
