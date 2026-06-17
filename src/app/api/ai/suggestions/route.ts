import { NextRequest, NextResponse } from 'next/server';
import { generateSuggestions } from '@/lib/ai/suggestions-service';
import type { ChatLocale } from '@/lib/ai/types';

function parseLocale(value: unknown): ChatLocale | undefined {
  if (value === 'fr' || value === 'en') return value;
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, projectId, locale, userId } = body as {
      workspaceId?: string;
      projectId?: string;
      locale?: unknown;
      userId?: string;
    };

    if (!workspaceId || typeof workspaceId !== 'string') {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const suggestions = await generateSuggestions({
      workspaceId,
      projectId: typeof projectId === 'string' ? projectId : undefined,
      locale: parseLocale(locale),
      userId: typeof userId === 'string' ? userId : undefined,
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('POST /api/ai/suggestions error:', error);

    if (error instanceof Error && error.message === 'Workspace not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ suggestions: [] });
  }
}
