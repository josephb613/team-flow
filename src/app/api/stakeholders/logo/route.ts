import { NextResponse } from 'next/server';
import { saveStakeholderLogo } from '@/lib/stakeholder-logo';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const url = await saveStakeholderLogo(file);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'upload_failed';

    if (message === 'invalid_type') {
      return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
    }

    if (message === 'too_large') {
      return NextResponse.json({ error: 'too_large' }, { status: 400 });
    }

    console.error('POST /api/stakeholders/logo error:', error);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }
}
