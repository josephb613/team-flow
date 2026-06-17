import { NextRequest, NextResponse } from 'next/server';
import { getWorkload } from '@/lib/pmp/workload';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-api';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const workload = await getWorkload(workspaceId);
    return NextResponse.json(workload);
  } catch (error) {
    console.error('GET /api/workload error:', error);
    return NextResponse.json({ error: 'Failed to compute workload' }, { status: 500 });
  }
}
