const DEFAULT_MAX_CHARS = 12_000;

/** Rough char budget for context injected into LLM prompts. */
export function truncateToTokenBudget(text: string, maxChars = DEFAULT_MAX_CHARS): string {
  if (text.length <= maxChars) return text;

  const truncated = text.slice(0, maxChars);
  const lastNewline = truncated.lastIndexOf('\n');
  const cutAt = lastNewline > maxChars * 0.8 ? lastNewline : maxChars;

  return `${truncated.slice(0, cutAt)}\n\n[Context truncated — ${text.length - cutAt} chars omitted]`;
}
