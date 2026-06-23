/**
 * Normalizes LLM chat output to plain, readable text (especially French).
 * Strips typographic conventions the UI does not render (markdown, guillemets, etc.).
 *
 * SECURITY NOTE: This is NOT an HTML sanitizer. Safe rendering depends on React JSX
 * text escaping (e.g. `<p>{normalizeChatText(msg.content)}</p>`). Do not pass output
 * to dangerouslySetInnerHTML without a proper HTML sanitizer.
 */
export function normalizeChatText(text: string): string {
  if (!text) return text;

  let result = text
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[\u00ab\u00bb\u2039\u203a]/g, '"')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '');

  result = result.replace(/[ \t]+([:;!?])/g, '$1');

  return result;
}

/** @deprecated Use normalizeChatText — name retained for backward compatibility. */
export const sanitizeChatResponse = normalizeChatText;
