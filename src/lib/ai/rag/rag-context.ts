import { isEmbedConfigured } from '../config';
import { semanticSearch } from '../embeddings/semantic-retriever';
import { sanitizePromptContent, wrapUserContentForPrompt } from '../sanitize-prompt-content';

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
      const title = sanitizePromptContent(chunk.title);
      const content = sanitizePromptContent(chunk.content);
      return `[${index + 1}] ${title} (${sourceLabel}, id: ${chunk.sourceId})
${content}`;
    });

    return wrapUserContentForPrompt('rag_documents', `## Documents pertinents\n\n${sections.join('\n\n')}`);
  } catch (error) {
    console.error('RAG retrieval failed:', error);
    return '';
  }
}
