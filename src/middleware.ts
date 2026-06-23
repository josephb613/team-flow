import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { validateCsrfOrigin } from '@/lib/auth/csrf';

function isPublicApiPath(pathname: string): boolean {
  if (pathname === '/api/auth/sync') {
    return false;
  }
  if (pathname.startsWith('/api/auth/')) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/') || isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
