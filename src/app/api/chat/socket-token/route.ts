import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/api-auth';
import { createChatSocketToken } from '@/lib/chat-socket-token';

export async function POST() {
  try {
    const auth = await requireApiAuth();
    if (!auth.ok) return auth.response;

    const token = createChatSocketToken({
      userId: auth.appUser.id,
      userName: auth.appUser.name,
      userAvatar: '',
    });

    return NextResponse.json({ token, expiresInSec: 300 });
  } catch (error) {
    console.error('POST /api/chat/socket-token error');
    return NextResponse.json({ error: 'Failed to issue socket token' }, { status: 500 });
  }
}
