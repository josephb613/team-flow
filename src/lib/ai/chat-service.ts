import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { getAiConfig, assertGroqConfigured } from './config';
import { getGroqClient } from './groq-client';
import { buildWorkspaceContext } from './context/context-builder';
import { buildRagContext } from './rag/rag-context';
import { buildSystemChatPrompt } from './prompts/system-chat';
import {
  buildToolAuthContext,
  executeTool,
  getGroqToolDefinitions,
} from './tools/executor';
import type { ChatStreamEvent, PendingActionEvent } from './tools/types';
import type { AiChatRequest, ChatHistoryMessage } from './types';

const MAX_TOOL_ROUNDS = 3;

function buildMessages(
  request: AiChatRequest,
  context: string,
  ragContext?: string
): ChatCompletionMessageParam[] {
  const ragSection = ragContext ? `\n\n--- Relevant Documents ---\n${ragContext}` : '';
  const systemContent = `${buildSystemChatPrompt(request.locale)}\n\n--- Workspace Context ---\n${context}${ragSection}`;
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemContent },
  ];

  if (request.history?.length) {
    for (const msg of request.history.slice(-10)) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: request.message.trim() });
  return messages;
}

interface ToolLoopResult {
  messages: ChatCompletionMessageParam[];
  pendingActions: PendingActionEvent[];
  directContent?: string;
}

async function runToolLoop(
  request: AiChatRequest,
  baseMessages: ChatCompletionMessageParam[]
): Promise<ToolLoopResult> {
  const messages = [...baseMessages];
  const pendingActions: PendingActionEvent[] = [];
  const tools = getGroqToolDefinitions();
  const { chatModel } = getAiConfig();
  const groq = getGroqClient();
  const authCtx = buildToolAuthContext({
    workspaceId: request.workspaceId,
    projectId: request.projectId,
    userId: request.userId,
    locale: request.locale,
  });

  let directContent: string | undefined;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await groq.chat.completions.create({
      model: chatModel,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2048,
    });

    const msg = response.choices?.[0]?.message;
    if (!msg) break;

    const toolCalls = msg.tool_calls;
    if (!toolCalls?.length) {
      directContent = msg.content ?? undefined;
      break;
    }

    messages.push({
      role: 'assistant',
      content: msg.content,
      tool_calls: toolCalls,
    });

    for (const toolCall of toolCalls) {
      const fn = toolCall.function;
      const result = await executeTool(fn.name, fn.arguments ?? '{}', authCtx);

      if (result.pending && result.actionId) {
        pendingActions.push({
          type: 'pending_action',
          actionId: result.actionId,
          toolName: fn.name,
          preview: result.preview,
        });
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  return { messages, pendingActions, directContent };
}

export interface ChatResponseWithActions {
  message: string;
  pendingActions: PendingActionEvent[];
}

export async function generateChatResponse(
  request: AiChatRequest
): Promise<ChatResponseWithActions> {
  assertGroqConfigured();

  const [context, ragContext] = await Promise.all([
    buildWorkspaceContext({
      workspaceId: request.workspaceId,
      projectId: request.projectId,
      userId: request.userId,
    }),
    buildRagContext(request.workspaceId, request.message),
  ]);

  const { chatModel } = getAiConfig();
  const groq = getGroqClient();
  const baseMessages = buildMessages(request, context, ragContext);
  const { messages, pendingActions, directContent } = await runToolLoop(
    request,
    baseMessages
  );

  if (directContent) {
    return { message: directContent, pendingActions };
  }

  const response = await groq.chat.completions.create({
    model: chatModel,
    messages,
    tools: getGroqToolDefinitions(),
    temperature: 0.7,
    max_tokens: 2048,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  return { message: content, pendingActions };
}

export async function* streamChatResponse(
  request: AiChatRequest
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  assertGroqConfigured();

  const [context, ragContext] = await Promise.all([
    buildWorkspaceContext({
      workspaceId: request.workspaceId,
      projectId: request.projectId,
      userId: request.userId,
    }),
    buildRagContext(request.workspaceId, request.message),
  ]);

  const { chatModel } = getAiConfig();
  const groq = getGroqClient();
  const baseMessages = buildMessages(request, context, ragContext);
  const { messages, pendingActions, directContent } = await runToolLoop(
    request,
    baseMessages
  );

  for (const pending of pendingActions) {
    yield pending;
  }

  if (directContent) {
    yield { type: 'token', content: directContent };
    return;
  }

  const stream = await groq.chat.completions.create({
    model: chatModel,
    messages,
    tools: getGroqToolDefinitions(),
    temperature: 0.7,
    max_tokens: 2048,
    stream: true,
  });

  for await (const chunk of stream) {
    const token = chunk.choices?.[0]?.delta?.content;
    if (token) {
      yield { type: 'token', content: token };
    }
  }
}

export function parseChatHistory(
  history: unknown
): ChatHistoryMessage[] | undefined {
  if (!Array.isArray(history)) return undefined;

  return history
    .filter(
      (m): m is ChatHistoryMessage =>
        typeof m === 'object' &&
        m !== null &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string'
    )
    .map((m) => ({ role: m.role, content: m.content }));
}
