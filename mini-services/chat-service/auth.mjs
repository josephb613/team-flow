import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_TTL_MS = 5 * 60 * 1000;

function getSecret() {
  const secret =
    process.env.CHAT_SOCKET_SECRET?.trim() ||
    process.env.NEON_AUTH_COOKIE_SECRET?.trim();
  if (!secret) {
    throw new Error('CHAT_SOCKET_SECRET or NEON_AUTH_COOKIE_SECRET is required');
  }
  return secret;
}

function decodePayload(encoded) {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
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

export function verifyChatSocketToken(token) {
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

export function sanitizeChatMessageContent(content) {
  return String(content)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 4000);
}
