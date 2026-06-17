import type { ChatLocale } from '../types';
import type { ToolAuthContext } from './types';

export function buildToolAuthContext(options: {
  workspaceId: string;
  projectId?: string;
  userId?: string;
  locale?: ChatLocale;
}): ToolAuthContext {
  if (!options.workspaceId) {
    throw new Error('workspaceId is required for tool execution');
  }

  return {
    workspaceId: options.workspaceId,
    projectId: options.projectId,
    userId: options.userId,
    locale: options.locale,
  };
}
