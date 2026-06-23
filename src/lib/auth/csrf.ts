import type { NextRequest } from 'next/server';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, '');
}

function getAllowedOrigins(request: NextRequest): Set<string> {
  const origins = new Set<string>();
  const host = request.headers.get('host');

  if (host) {
    origins.add(normalizeOrigin(`https://${host}`));
    origins.add(normalizeOrigin(`http://${host}`));
  }

  const envOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envOrigin) {
    origins.add(normalizeOrigin(envOrigin));
  }

  const extra = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? [];
  for (const origin of extra) {
    origins.add(normalizeOrigin(origin));
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3003');
    origins.add('http://127.0.0.1:3003');
  }

  return origins;
}

export function validateCsrfOrigin(request: NextRequest): boolean {
  if (!MUTATING_METHODS.has(request.method)) {
    return true;
  }

  const origin = request.headers.get('origin');
  if (origin) {
    const allowed = getAllowedOrigins(request);
    return allowed.has(normalizeOrigin(origin));
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererOrigin = normalizeOrigin(new URL(referer).origin);
      const allowed = getAllowedOrigins(request);
      return allowed.has(refererOrigin);
    } catch {
      return false;
    }
  }

  // Non-browser clients (no Origin/Referer) are allowed when authenticated via middleware.
  return true;
}
