import { NextRequest, NextResponse } from 'next/server';
import { requireApiWorkspaceAuth } from '@/lib/auth/api-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { semanticSearch } from '@/lib/ai/embeddings/semantic-retriever';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiWorkspaceAuth(request);
    if (!auth.ok) return auth.response;

    const q = request.nextUrl.searchParams.get('q');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(Number(limitParam), 1), 50) : 8;

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ error: 'q is required' }, { status: 400 });
    }

    const rate = checkRateLimit(
      `ai-search:${auth.appUser.id}:${getClientIp(request)}`,
      60,
      60_000
    );
    if (!rate.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
      );
    }

    const results = await semanticSearch(auth.workspaceId, q, limit);

    return NextResponse.json({
      workspaceId: auth.workspaceId,
      query: q,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('GET /api/ai/search error');

    const message = error instanceof Error ? error.message : 'Search failed';
    const status = message === 'Workspace not found' ? 404 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
