import { NextResponse } from 'next/server';
import { getEvmSummary } from '@/lib/pmp/evm';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') ?? undefined;
    const workspaceId = getWorkspaceIdFromRequest(request);

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const results = await getEvmSummary(workspaceId, projectId);
    return NextResponse.json(projectId ? results : results);
  } catch (error) {
    console.error('GET /api/evm error:', error);
    return NextResponse.json({ error: 'Failed to compute EVM' }, { status: 500 });
  }
}
