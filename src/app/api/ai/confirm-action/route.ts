import { NextRequest, NextResponse } from 'next/server';
import { enforceAiRouteAccess } from '@/lib/ai/ai-route-auth';
import {
  buildToolAuthContext,
  deletePendingAction,
  executeConfirmedAction,
  getPendingAction,
} from '@/lib/ai/tools/executor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { actionId } = body as {
      actionId?: string;
      workspaceId?: string;
      userId?: string;
    };

    const access = await enforceAiRouteAccess(request, body);
    if (!access.ok) return access.response;

    if (!actionId || typeof actionId !== 'string') {
      return NextResponse.json({ error: 'actionId is required' }, { status: 400 });
    }

    const pending = await getPendingAction(actionId, access.workspaceId);
    if (!pending) {
      return NextResponse.json(
        { error: 'Action not found or expired' },
        { status: 404 }
      );
    }

    const authCtx = buildToolAuthContext({
      workspaceId: access.workspaceId,
      userId: access.appUserId,
    });

    const result = await executeConfirmedAction(
      pending.toolName,
      pending.args,
      authCtx
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Action failed' }, { status: 400 });
    }

    await deletePendingAction(actionId);

    return NextResponse.json({
      success: true,
      toolName: pending.toolName,
      data: result.data,
    });
  } catch (error) {
    console.error('POST /api/ai/confirm-action error');
    return NextResponse.json({ error: 'Failed to confirm action' }, { status: 500 });
  }
}
