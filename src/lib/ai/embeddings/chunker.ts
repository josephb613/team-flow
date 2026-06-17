import { createHash } from 'crypto';
import type { ChunkInput } from './types';

/** ~4 chars per token — target 400–800 tokens */
const MIN_CHUNK_CHARS = 1600;
const MAX_CHUNK_CHARS = 3200;
const SHORT_DOC_CHARS = 2400;

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

function splitBySize(text: string, maxSize = MAX_CHUNK_CHARS): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  if (normalized.length <= maxSize) {
    return [normalized];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + maxSize, normalized.length);

    if (end < normalized.length) {
      const slice = normalized.slice(start, end);
      const breakAt = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('. '));
      if (breakAt > MIN_CHUNK_CHARS / 2) {
        end = start + breakAt + (slice[breakAt] === '.' ? 2 : 2);
      }
    }

    chunks.push(normalized.slice(start, end).trim());
    start = end;
  }

  return chunks.filter(Boolean);
}

function splitMarkdownSections(content: string): string[] {
  const normalized = normalizeText(content);
  if (!normalized) return [];

  const sections = normalized.split(/(?=^#{1,6}\s)/m).filter(Boolean);
  if (sections.length > 1) {
    return sections.map((s) => s.trim()).filter(Boolean);
  }

  const paragraphs = normalized.split(/\n{2,}/).filter(Boolean);
  if (paragraphs.length > 1) {
    return paragraphs;
  }

  return [normalized];
}

function groupSectionsIntoChunks(sections: string[]): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const section of sections) {
    const piece = section.trim();
    if (!piece) continue;

    if (piece.length > MAX_CHUNK_CHARS) {
      if (current) {
        chunks.push(current.trim());
        current = '';
      }
      chunks.push(...splitBySize(piece));
      continue;
    }

    if (!current) {
      current = piece;
      continue;
    }

    if (current.length + piece.length + 2 <= MAX_CHUNK_CHARS) {
      current = `${current}\n\n${piece}`;
    } else {
      chunks.push(current.trim());
      current = piece;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

function buildChunksFromSections(
  title: string,
  sections: string[],
  metadata?: Record<string, unknown>
): ChunkInput[] {
  const grouped = groupSectionsIntoChunks(sections);
  if (grouped.length === 0) return [];

  return grouped.map((content, index) => ({
    title,
    content,
    chunkIndex: index,
    metadata,
  }));
}

export function chunkWikiPage(title: string, content: string): ChunkInput[] {
  const sections = splitMarkdownSections(content);
  return buildChunksFromSections(title, sections, { entity: 'wiki_page' });
}

export function chunkProject(name: string, description: string | null | undefined): ChunkInput[] {
  const text = normalizeText(description ?? '');
  if (!text) return [];

  if (text.length <= SHORT_DOC_CHARS) {
    return [{ title: name, content: text, chunkIndex: 0, metadata: { entity: 'project' } }];
  }

  return splitBySize(text).map((content, index) => ({
    title: name,
    content,
    chunkIndex: index,
    metadata: { entity: 'project' },
  }));
}

export function chunkChangeRequest(
  title: string,
  description: string | null | undefined,
  decision: string | null | undefined
): ChunkInput[] {
  const parts = [normalizeText(description ?? ''), normalizeText(decision ?? '')].filter(Boolean);
  const text = parts.join('\n\n');
  if (!text) return [];

  return [{ title, content: text, chunkIndex: 0, metadata: { entity: 'change_request' } }];
}

export function chunkMeeting(
  title: string,
  description: string | null | undefined
): ChunkInput[] {
  const text = [title, normalizeText(description ?? '')].filter(Boolean).join('\n\n');
  if (!text) return [];

  return [{ title, content: text, chunkIndex: 0, metadata: { entity: 'meeting' } }];
}

export function chunkRisk(
  title: string,
  description: string | null | undefined,
  mitigationPlan: string | null | undefined
): ChunkInput[] {
  const parts = [
    normalizeText(description ?? ''),
    mitigationPlan ? `Mitigation: ${normalizeText(mitigationPlan)}` : '',
  ].filter(Boolean);
  const text = parts.join('\n\n');
  if (!text) return [];

  return [{ title, content: text, chunkIndex: 0, metadata: { entity: 'risk' } }];
}

export function chunkTask(
  title: string,
  description: string | null | undefined,
  comments: string[]
): ChunkInput[] {
  const desc = normalizeText(description ?? '');
  const commentBlock = comments
    .map((c) => normalizeText(c))
    .filter(Boolean)
  const commentText =
    commentBlock.length > 0 ? `Comments:\n${commentBlock.map((c) => `- ${c}`).join('\n')}` : '';

  const sections: string[] = [];
  if (desc) sections.push(desc);
  if (commentText) sections.push(commentText);

  if (sections.length === 0) return [];

  return buildChunksFromSections(title, sections, { entity: 'task' });
}

export function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
