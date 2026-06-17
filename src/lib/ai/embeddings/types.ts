export type DocumentSourceType =
  | 'wiki_page'
  | 'project'
  | 'task'
  | 'change_request'
  | 'meeting'
  | 'risk';

export interface ChunkInput {
  title: string;
  content: string;
  chunkIndex: number;
  metadata?: Record<string, unknown>;
}

export interface IndexedChunk {
  id: string;
  workspaceId: string;
  sourceType: DocumentSourceType;
  sourceId: string;
  title: string;
  content: string;
  chunkIndex: number;
  contentHash: string;
  metadata: Record<string, unknown>;
}

export interface RetrievedChunk {
  id: string;
  sourceType: DocumentSourceType;
  sourceId: string;
  title: string;
  content: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
  score: number;
}
