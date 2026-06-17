import { isEmbedConfigured } from '../config';
import { semanticSearch } from '../embeddings/semantic-retriever';

const DEFAULT_TOP_K = 8;

function formatSourceLabel(sourceType: string): string {
  return sourceType.replace(/_/g, ' ');
}

export async function buildRagContext(
  workspaceId: string,
  query: string,
  topK = DEFAULT_TOP_K
): Promise<string> {
  const trimmed = query.trim();
  if (!trimmed || !isEmbedConfigured()) return '';

  try {
    const chunks = await semanticSearch(workspaceId, trimmed, topK);
    if (chunks.length === 0) return '';

    const sections = chunks.map((chunk, index) => {
      const sourceLabel = formatSourceLabel(chunk.sourceType);
      return `[${index + 1}] ${chunk.title} (${sourceLabel}, id: ${chunk.sourceId})
${chunk.content}`;
    });

    return `## Documents pertinents\n\n${sections.join('\n\n')}`;
  } catch (error) {
    console.error('RAG retrieval failed:', error);
    return '';
  }
}
