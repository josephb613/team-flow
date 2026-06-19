export type ChatLocale = 'fr' | 'en';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatRequest {
  message: string;
  workspaceId: string;
  projectId?: string;
  history?: ChatHistoryMessage[];
  locale?: ChatLocale;
  userId?: string;
}

export interface AiSuggestionsRequest {
  workspaceId: string;
  projectId?: string;
  locale?: ChatLocale;
  userId?: string;
}

export interface StreamEvent {
  type: 'token' | 'error' | 'done';
  content?: string;
}

export interface SmartSuggestion {
  id: string;
  icon: string;
  title: string;
  description: string;
  action: string;
  actionType:
    | 'create_task'
    | 'view_project'
    | 'schedule_meeting'
    | 'review_task'
    | 'check_deadline';
}

export interface ContextBuilderOptions {
  workspaceId: string;
  projectId?: string;
  userId?: string;
}
