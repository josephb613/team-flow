import 'server-only';

import Groq from 'groq-sdk';
import { getAiConfig } from './config';

let client: Groq | null = null;

export function getGroqClient(): Groq {
  if (!client) {
    const { groqApiKey } = getAiConfig();
    client = new Groq({ apiKey: groqApiKey });
  }
  return client;
}
