import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const TOKEN_TTL_MS = 5 * 60 * 1000;

type SocketTokenPayload = {
  userId: string;
  userName: string;
  userAvatar: string;
  exp: number;
};

function getSecret(): string {
  const secret =
    process.env.CHAT_SOCKET_SECRET?.trim() ||
    process.env.NEON_AUTH_COOKIE_SECRET?.trim();
  if (!secret) {
    throw new Error('CHAT_SOCKET_SECRET or NEON_AUTH_COOKIE_SECRET is required');
  }
  return secret;
}

function encodePayload(payload: SocketTokenPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(encoded: string): SocketTokenPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SocketTokenPayload;
    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.userName !== 'string' ||
      typeof parsed.userAvatar !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createChatSocketToken(input: {
  userId: string;
  userName: string;
  userAvatar: string;
}): string {
  const payload = encodePayload({
    ...input,
    exp: Date.now() + TOKEN_TTL_MS,
  });
  const signature = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyChatSocketToken(token: string): SocketTokenPayload | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  const decoded = decodePayload(payload);
  if (!decoded || decoded.exp < Date.now()) {
    return null;
  }

  return decoded;
}

export function sanitizeChatMessageContent(content: string): string {
  return content
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 4000);
}
