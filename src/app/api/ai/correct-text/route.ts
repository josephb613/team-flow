import { NextRequest, NextResponse } from 'next/server';
import { correctText } from '@/lib/ai/text-correction-service';
import { enforceAiRouteAccess } from '@/lib/ai/ai-route-auth';
import type { ChatLocale } from '@/lib/ai/types';

function parseLocale(value: unknown): ChatLocale | undefined {
  if (value === 'fr' || value === 'en') return value;
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, locale } = body as {
      text?: string;
      workspaceId?: string;
      locale?: unknown;
    };

    const access = await enforceAiRouteAccess(request, body);
    if (!access.ok) return access.response;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const corrected = await correctText({
      text,
      locale: parseLocale(locale),
    });

    return NextResponse.json({ text: corrected });
  } catch (error) {
    console.error('POST /api/ai/correct-text error');

    if (error instanceof Error && error.message === 'GROQ_API_KEY is not configured') {
      return NextResponse.json({ error: 'AI service is not configured' }, { status: 503 });
    }

    return NextResponse.json(
      { error: 'Text correction failed' },
      { status: 500 }
    );
  }
}
