import 'server-only';

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import { requireApiWorkspaceAuthFromBody } from '@/lib/auth/api-auth';

const AI_RATE_LIMIT = 30;
const AI_RATE_WINDOW_MS = 60_000;

export async function enforceAiRouteAccess(
  request: Request,
  body: { workspaceId?: unknown }
) {
  const auth = await requireApiWorkspaceAuthFromBody(request, body);
  if (!auth.ok) return auth;

  const rateKey = `ai:${auth.appUser.id}:${getClientIp(request)}`;
  const rate = checkRateLimit(rateKey, AI_RATE_LIMIT, AI_RATE_WINDOW_MS);
  if (!rate.ok) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rate.retryAfterSec) },
        }
      ),
    };
  }

  return {
    ok: true as const,
    appUserId: auth.appUser.id,
    workspaceId: auth.workspaceId,
  };
}
