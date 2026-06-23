import 'server-only';

import OpenAI from 'openai';
import { getAiConfig, assertEmbedConfigured } from '../config';

let client: OpenAI | null = null;

export function getNvidiaEmbedClient(): OpenAI {
  assertEmbedConfigured();
  const { nvidiaApiKey, embedBaseUrl } = getAiConfig();

  if (!client) {
    client = new OpenAI({
      apiKey: nvidiaApiKey,
      baseURL: embedBaseUrl,
    });
  }

  return client;
}

export type EmbedInputType = 'passage' | 'query';

export interface EmbedTextsOptions {
  inputType: EmbedInputType;
  texts: string[];
}

function normalizeEmbeddingDimensions(
  embedding: number[],
  targetDimensions: number
): number[] {
  if (embedding.length === targetDimensions) {
    return embedding;
  }
  if (embedding.length > targetDimensions) {
    return embedding.slice(0, targetDimensions);
  }
  throw new Error(
    `Embedding dimension ${embedding.length} is smaller than configured ${targetDimensions}`
  );
}

export async function embedTexts(options: EmbedTextsOptions): Promise<number[][]> {
  const { embedModel, embedDimensions } = getAiConfig();
  const openai = getNvidiaEmbedClient();

  const response = await openai.embeddings.create({
    model: embedModel,
    input: options.texts,
    encoding_format: 'float',
    input_type: options.inputType,
    truncate: 'END',
  } as OpenAI.EmbeddingCreateParams);

  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => normalizeEmbeddingDimensions(item.embedding, embedDimensions));
}
