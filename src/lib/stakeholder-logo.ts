import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export async function saveStakeholderLogo(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('invalid_type');
  }

  if (file.size > MAX_SIZE) {
    throw new Error('too_large');
  }

  const ext = EXT_BY_TYPE[file.type] ?? '.jpg';
  const filename = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'stakeholders');

  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  return `/uploads/stakeholders/${filename}`;
}
