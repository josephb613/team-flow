import { db } from '@/lib/db';
import { embedTexts } from './nvidia-client';
import type { DocumentSourceType, RetrievedChunk } from './types';
import { vectorSql } from './vector-sql';

const DEFAULT_TOP_K = 8;

export async function semanticSearch(
  workspaceId: string,
  query: string,
  limit = DEFAULT_TOP_K
): Promise<RetrievedChunk[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const [queryEmbedding] = await embedTexts({
    texts: [trimmed],
    inputType: 'query',
  });

  if (!queryEmbedding?.length) return [];

  const embeddingVector = vectorSql(queryEmbedding);

  const rows = await db.$queryRaw<
    Array<{
      id: string;
      sourceType: string;
      sourceId: string;
      title: string;
      content: string;
      chunkIndex: number;
      metadata: unknown;
      distance: number;
    }>
  >`
    SELECT
      "id",
      "sourceType",
      "sourceId",
      "title",
      "content",
      "chunkIndex",
      "metadata",
      ("embedding" <=> ${embeddingVector}) AS distance
    FROM "DocumentChunk"
    WHERE "workspaceId" = ${workspaceId}
    ORDER BY "embedding" <=> ${embeddingVector}
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    sourceType: row.sourceType as DocumentSourceType,
    sourceId: row.sourceId,
    title: row.title,
    content: row.content,
    chunkIndex: row.chunkIndex,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    score: 1 - Number(row.distance),
  }));
}
