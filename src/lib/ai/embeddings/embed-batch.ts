import { embedTexts, type EmbedInputType } from './nvidia-client';

const DEFAULT_BATCH_SIZE = 16;
const BATCH_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function embedBatch(
  texts: string[],
  inputType: EmbedInputType,
  batchSize = DEFAULT_BATCH_SIZE
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await embedTexts({ texts: batch, inputType });
    embeddings.push(...batchEmbeddings);

    if (i + batchSize < texts.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return embeddings;
}
