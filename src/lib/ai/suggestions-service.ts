import { assertGroqConfigured, getAiConfig } from './config';
import { getGroqClient } from './groq-client';
import { buildWorkspaceContext } from './context/context-builder';
import { SYSTEM_SUGGESTIONS_PROMPT } from './prompts/system-suggestions';
import type { AiSuggestionsRequest, SmartSuggestion } from './types';

function parseSuggestions(raw: string): SmartSuggestion[] {
  const cleanContent = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleanContent) as unknown;

  if (!Array.isArray(parsed)) return [];

  const validActionTypes = new Set([
    'create_task',
    'view_project',
    'schedule_meeting',
    'review_task',
    'check_deadline',
  ]);

  return parsed
    .filter(
      (item): item is SmartSuggestion =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as SmartSuggestion).id === 'string' &&
        typeof (item as SmartSuggestion).title === 'string' &&
        typeof (item as SmartSuggestion).description === 'string' &&
        typeof (item as SmartSuggestion).action === 'string' &&
        validActionTypes.has((item as SmartSuggestion).actionType)
    )
    .slice(0, 5);
}

export async function generateSuggestions(
  request: AiSuggestionsRequest
): Promise<SmartSuggestion[]> {
  assertGroqConfigured();

  const context = await buildWorkspaceContext({
    workspaceId: request.workspaceId,
    projectId: request.projectId,
    userId: request.userId,
  });

  const localeHint =
    request.locale === 'fr'
      ? 'Generate titles and descriptions in French.'
      : request.locale === 'en'
        ? 'Generate titles and descriptions in English.'
        : '';

  const { chatModel } = getAiConfig();
  const groq = getGroqClient();

  const response = await groq.chat.completions.create({
    model: chatModel,
    messages: [
      { role: 'system', content: SYSTEM_SUGGESTIONS_PROMPT },
      {
        role: 'user',
        content: `Workspace context:\n${context}${localeHint ? `\n\n${localeHint}` : ''}`,
      },
    ],
    temperature: 0.8,
    max_tokens: 1024,
  });

  const aiContent = response.choices?.[0]?.message?.content;
  if (!aiContent) return [];

  try {
    return parseSuggestions(aiContent);
  } catch {
    return [];
  }
}
