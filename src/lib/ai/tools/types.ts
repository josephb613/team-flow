import type { ChatLocale } from '../types';

export type ToolKind = 'read' | 'write';

export interface ToolAuthContext {
  workspaceId: string;
  projectId?: string;
  userId?: string;
  locale?: ChatLocale;
}

export interface ToolDefinition {
  name: string;
  kind: ToolKind;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  pending?: boolean;
  preview?: unknown;
  actionId?: string;
}

export type WriteToolName =
  | 'create_task'
  | 'update_task_status'
  | 'create_risk'
  | 'update_risk'
  | 'create_change_request'
  | 'update_change_request_status'
  | 'update_task'
  | 'log_time_entry'
  | 'create_sprint';

export interface PendingAction {
  actionId: string;
  toolName: WriteToolName;
  args: Record<string, unknown>;
  workspaceId: string;
  userId?: string;
  preview: unknown;
  createdAt: number;
  expiresAt: number;
}

export interface PendingActionEvent {
  type: 'pending_action';
  actionId: string;
  toolName: string;
  preview: unknown;
}

export type ChatStreamEvent =
  | { type: 'token'; content: string }
  | PendingActionEvent
  | { type: 'error'; content: string };
