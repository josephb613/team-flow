import { NextRequest, NextResponse } from 'next/server';
import {
  buildToolAuthContext,
  deletePendingAction,
  executeConfirmedAction,
  getPendingAction,
} from '@/lib/ai/tools/executor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { actionId, workspaceId, userId } = body as {
      actionId?: string;
      workspaceId?: string;
      userId?: string;
    };

    if (!actionId || typeof actionId !== 'string') {
      return NextResponse.json({ error: 'actionId is required' }, { status: 400 });
    }

    if (!workspaceId || typeof workspaceId !== 'string') {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const pending = await getPendingAction(actionId, workspaceId);
    if (!pending) {
      return NextResponse.json(
        { error: 'Action not found or expired' },
        { status: 404 }
      );
    }

    const authCtx = buildToolAuthContext({
      workspaceId,
      userId: typeof userId === 'string' ? userId : pending.userId,
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
    console.error('POST /api/ai/confirm-action error:', error);
    return NextResponse.json({ error: 'Failed to confirm action' }, { status: 500 });
  }
}
