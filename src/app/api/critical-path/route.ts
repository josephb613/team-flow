import { NextResponse } from 'next/server';
import { getCriticalPath } from '@/lib/pmp/critical-path';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const workspaceId = getWorkspaceIdFromRequest(request);

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const result = await getCriticalPath(projectId, workspaceId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/critical-path error:', error);
    const message = error instanceof Error ? error.message : 'Failed to compute critical path';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
