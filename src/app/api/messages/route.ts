import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-api';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);

    const messages = await db.message.findMany({
      where: workspaceId ? { channel: { workspaceId } } : undefined,
      include: {
        user: true,
        channel: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, channelId, userId } = body;

    const message = await db.message.create({
      data: {
        content,
        channelId,
        userId,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
