/**
 * Escapes user-controlled text before it is embedded in LLM prompts.
 * This is defense-in-depth against prompt injection via task titles, wiki content, etc.
 */
export function sanitizePromptContent(text: string): string {
  if (!text) return text;

  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/```/g, '`\u200b``')
    .replace(/<\/?system>/gi, '')
    .replace(/<\/?assistant>/gi, '')
    .replace(/<\/?user>/gi, '')
    .trim();
}

export function wrapUserContentForPrompt(
  role: string,
  content: string
): string {
  const safeRole = sanitizePromptContent(role).replace(/[^a-z0-9_-]/gi, '_');
  const safeContent = sanitizePromptContent(content);
  return `<user_content role="${safeRole}">\n${safeContent}\n</user_content>`;
}
