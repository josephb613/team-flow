import { NextRequest, NextResponse } from 'next/server';
import { generateSuggestions } from '@/lib/ai/suggestions-service';
import { enforceAiRouteAccess } from '@/lib/ai/ai-route-auth';
import type { ChatLocale } from '@/lib/ai/types';

function parseLocale(value: unknown): ChatLocale | undefined {
  if (value === 'fr' || value === 'en') return value;
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, locale } = body as {
      workspaceId?: string;
      projectId?: string;
      locale?: unknown;
      userId?: string;
    };

    const access = await enforceAiRouteAccess(request, body);
    if (!access.ok) return access.response;

    const suggestions = await generateSuggestions({
      workspaceId: access.workspaceId,
      projectId: typeof projectId === 'string' ? projectId : undefined,
      locale: parseLocale(locale),
      userId: access.appUserId,
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('POST /api/ai/suggestions error');

    if (error instanceof Error && error.message === 'Workspace not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ suggestions: [] });
  }
}
