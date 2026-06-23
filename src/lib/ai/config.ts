import 'server-only';

export interface AiConfig {
  groqApiKey: string;
  chatModel: string;
  chatProvider: string;
  nvidiaApiKey: string;
  embedModel: string;
  embedBaseUrl: string;
  embedDimensions: number;
}

export function getAiConfig(): AiConfig {
  return {
    groqApiKey: process.env.GROQ_API_KEY ?? '',
    chatModel: process.env.AI_CHAT_MODEL ?? 'openai/gpt-oss-120b',
    chatProvider: process.env.AI_CHAT_PROVIDER ?? 'groq',
    nvidiaApiKey: process.env.NVIDIA_API_KEY ?? '',
    embedModel: process.env.AI_EMBED_MODEL ?? 'nvidia/nv-embed-v1',
    embedBaseUrl:
      process.env.AI_EMBED_BASE_URL ?? 'https://integrate.api.nvidia.com/v1',
    embedDimensions: Number(process.env.AI_EMBED_DIMENSIONS ?? '1024'),
  };
}

export function assertGroqConfigured(): void {
  const { groqApiKey, chatProvider } = getAiConfig();
  if (chatProvider === 'groq' && !groqApiKey) {
    console.error('[ai/chat] GROQ_API_KEY is not configured');
    throw new Error('GROQ_API_KEY is not configured');
  }
}

export function assertEmbedConfigured(): void {
  const { nvidiaApiKey } = getAiConfig();
  if (!nvidiaApiKey) {
    throw new Error('NVIDIA_API_KEY is not configured');
  }
}

export function isEmbedConfigured(): boolean {
  return Boolean(getAiConfig().nvidiaApiKey);
}
