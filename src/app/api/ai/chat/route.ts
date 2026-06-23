import { NextRequest, NextResponse } from 'next/server';
import {
  generateChatResponse,
  parseChatHistory,
  streamChatResponse,
} from '@/lib/ai/chat-service';
import { enforceAiRouteAccess } from '@/lib/ai/ai-route-auth';
import type { ChatLocale } from '@/lib/ai/types';

function wantsStreaming(request: NextRequest): boolean {
  const streamParam = request.nextUrl.searchParams.get('stream');
  if (streamParam === 'false' || streamParam === '0') return false;
  if (streamParam === 'true' || streamParam === '1') return true;

  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('application/json') && !accept.includes('text/event-stream')) {
    return false;
  }

  return true;
}

function parseLocale(value: unknown): ChatLocale | undefined {
  if (value === 'fr' || value === 'en') return value;
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      workspaceId,
      projectId,
      history,
      locale,
    } = body as {
      message?: string;
      workspaceId?: string;
      projectId?: string;
      history?: unknown;
      locale?: unknown;
      userId?: string;
    };

    const access = await enforceAiRouteAccess(request, body);
    if (!access.ok) return access.response;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const streaming = wantsStreaming(request);

    const chatRequest = {
      message,
      workspaceId: access.workspaceId,
      projectId: typeof projectId === 'string' ? projectId : undefined,
      history: parseChatHistory(history),
      locale: parseLocale(locale),
      userId: access.appUserId,
    };

    if (!streaming) {
      const { message: content, pendingActions } = await generateChatResponse(chatRequest);
      return NextResponse.json({ message: content, pendingActions });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamChatResponse(chatRequest)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          console.error('[ai/chat] Stream error');
          const event = JSON.stringify({ type: 'error', content: 'Stream failed' });
          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[ai/chat] Fatal error');

    const message =
      error instanceof Error && error.message === 'Workspace not found'
        ? error.message
        : 'Failed to get AI response';

    const status =
      error instanceof Error && error.message === 'Workspace not found' ? 404 : 500;

    return NextResponse.json(
      {
        error: message,
        fallback:
          "I'm having trouble connecting right now. Please try again in a moment.",
      },
      { status }
    );
  }
}
