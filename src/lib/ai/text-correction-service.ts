import { assertGroqConfigured, getAiConfig } from './config';
import { getGroqClient } from './groq-client';
import { SYSTEM_TEXT_CORRECTION_PROMPT } from './prompts/system-text-correction';
import type { ChatLocale } from './types';

export interface TextCorrectionRequest {
  text: string;
  locale?: ChatLocale;
}

export async function correctText(
  request: TextCorrectionRequest
): Promise<string> {
  assertGroqConfigured();

  const trimmed = request.text.trim();
  if (!trimmed) return '';

  const localeHint =
    request.locale === 'fr'
      ? 'The message is in French. Apply French grammar and style conventions.'
      : request.locale === 'en'
        ? 'The message is in English. Apply English grammar and style conventions.'
        : '';

  const { chatModel } = getAiConfig();
  const groq = getGroqClient();

  const response = await groq.chat.completions.create({
    model: chatModel,
    messages: [
      { role: 'system', content: SYSTEM_TEXT_CORRECTION_PROMPT },
      {
        role: 'user',
        content: localeHint ? `${localeHint}\n\n${trimmed}` : trimmed,
      },
    ],
    temperature: 0.2,
    max_tokens: 1024,
  });

  const corrected = response.choices?.[0]?.message?.content?.trim();
  if (!corrected) {
    throw new Error('Empty correction response');
  }

  return corrected;
}
