import { NextRequest, NextResponse } from 'next/server';
import { generateChatResponse, parseChatHistory } from '@/lib/ai/chat-service';
import { generateSuggestions } from '@/lib/ai/suggestions-service';
import type { ChatLocale } from '@/lib/ai/types';

function parseLocale(value: unknown): ChatLocale | undefined {
  if (value === 'fr' || value === 'en') return value;
  return undefined;
}

/**
 * Backward-compatible proxy for legacy `/api/ai-chat` clients.
 * Forwards to Groq-backed chat and suggestions services.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      context,
      mode,
      workspaceId,
      projectId,
      history,
      locale,
      userId,
    } = body as {
      message?: string;
      context?: string;
      mode?: string;
      workspaceId?: string;
      projectId?: string;
      history?: unknown;
      locale?: unknown;
      userId?: string;
    };

    if (mode === 'suggestions') {
      if (!workspaceId || typeof workspaceId !== 'string') {
        return NextResponse.json({ suggestions: [] });
      }

      const suggestions = await generateSuggestions({
        workspaceId,
        projectId: typeof projectId === 'string' ? projectId : undefined,
        locale: parseLocale(locale),
        userId: typeof userId === 'string' ? userId : undefined,
      });

      return NextResponse.json({ suggestions });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!workspaceId || typeof workspaceId !== 'string') {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    const chatRequest = {
      message,
      workspaceId,
      projectId: typeof projectId === 'string' ? projectId : undefined,
      history: parseChatHistory(history),
      locale: parseLocale(locale),
      userId: typeof userId === 'string' ? userId : undefined,
    };

    // Legacy clients may still send a pre-built context string — prepend via history shim
    if (context && typeof context === 'string' && !chatRequest.history?.length) {
      chatRequest.history = [
        { role: 'user' as const, content: `[Legacy context]: ${context}` },
        {
          role: 'assistant' as const,
          content: 'Understood, I have the workspace context.',
        },
      ];
    }

    const content = await generateChatResponse(chatRequest);
    return NextResponse.json({ message: content });
  } catch (error) {
    console.error('AI Chat API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get AI response',
        fallback:
          "I'm having trouble connecting right now. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
