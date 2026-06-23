import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/api-auth';
import { saveWorkspaceLogo } from '@/lib/workspace-logo';

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth();
    if (!auth.ok) return auth.response;

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const url = await saveWorkspaceLogo(file);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'upload_failed';

    if (message === 'invalid_type') {
      return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
    }

    if (message === 'too_large') {
      return NextResponse.json({ error: 'too_large' }, { status: 400 });
    }

    console.error('POST /api/workspaces/logo error');
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }
}
