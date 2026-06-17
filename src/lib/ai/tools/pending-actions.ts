import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import type { PendingAction, WriteToolName } from './types';

const PENDING_TTL_MS = 15 * 60 * 1000;

function rowToPendingAction(row: {
  id: string;
  toolName: string;
  args: unknown;
  workspaceId: string;
  userId: string | null;
  preview: unknown;
  createdAt: Date;
  expiresAt: Date;
}): PendingAction {
  return {
    actionId: row.id,
    toolName: row.toolName as WriteToolName,
    args: row.args as Record<string, unknown>,
    workspaceId: row.workspaceId,
    userId: row.userId ?? undefined,
    preview: row.preview,
    createdAt: row.createdAt.getTime(),
    expiresAt: row.expiresAt.getTime(),
  };
}

async function cleanupExpired(): Promise<void> {
  await db.aiPendingAction.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

export async function storePendingAction(
  input: Omit<PendingAction, 'actionId' | 'createdAt' | 'expiresAt'>
): Promise<PendingAction> {
  await cleanupExpired();

  const now = Date.now();
  const actionId = randomUUID();
  const createdAt = new Date(now);
  const expiresAt = new Date(now + PENDING_TTL_MS);

  const row = await db.aiPendingAction.create({
    data: {
      id: actionId,
      toolName: input.toolName,
      args: input.args,
      workspaceId: input.workspaceId,
      userId: input.userId ?? null,
      preview: input.preview as object,
      createdAt,
      expiresAt,
    },
  });

  return rowToPendingAction(row);
}

export async function getPendingAction(
  actionId: string,
  workspaceId: string
): Promise<PendingAction | null> {
  const row = await db.aiPendingAction.findFirst({
    where: {
      id: actionId,
      workspaceId,
      expiresAt: { gt: new Date() },
    },
  });

  if (!row) return null;
  return rowToPendingAction(row);
}

export async function deletePendingAction(actionId: string): Promise<void> {
  await db.aiPendingAction.deleteMany({
    where: { id: actionId },
  });
}
