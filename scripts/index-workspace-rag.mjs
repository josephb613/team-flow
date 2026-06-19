/**
 * Index all RAG document chunks for a workspace.
 * Usage: bun scripts/index-workspace-rag.mjs <workspaceId>
 */
import { indexWorkspace } from '../src/lib/ai/embeddings/indexer.ts';

const workspaceId = process.argv[2];

if (!workspaceId) {
  console.error('Usage: bun scripts/index-workspace-rag.mjs <workspaceId>');
  process.exit(1);
}

try {
  const result = await indexWorkspace(workspaceId);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Indexing failed:', error);
  process.exit(1);
}
