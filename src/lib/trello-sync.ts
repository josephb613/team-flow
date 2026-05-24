// ============================================================
// Trello Sync Service — bidirectional synchronization between
// TeamFlow tasks and Trello cards.
// ============================================================

import { db as prismaDb } from "@/lib/db";
import * as Trello from "@/lib/trello-client";

// Cast to any for Trello model access (LSP cache workaround)
const db = prismaDb as any;

// Minimal interface matching the TrelloIntegration model
export interface TrelloIntegration {
  id: string;
  workspaceId: string;
  trelloApiKey: string;
  trelloToken: string;
  boardId: string;
  boardName: string;
  listMapping: Record<string, string>;
  memberMapping: Record<string, string>;
  enabled: boolean;
  syncDirection: string;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Types ----

type TrelloAuth = {
  apiKey: string;
  token: string;
};

interface TeamFlowTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  projectId: string;
  assigneeId: string | null;
}

const MARKER_PREFIX = "<!-- teamflow:";
const MARKER_SUFFIX = "-->";

function encodeMarker(taskId: string): string {
  return `${MARKER_PREFIX}${taskId}${MARKER_SUFFIX}`;
}

function decodeMarker(desc: string): string | null {
  const re = new RegExp(
    `${MARKER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([a-zA-Z0-9_-]+)${MARKER_SUFFIX}`,
  );
  const m = desc.match(re);
  return m ? m[1] : null;
}

function buildCardDescription(task: TeamFlowTask): string {
  const marker = encodeMarker(task.id);
  const desc = task.description || "";
  if (desc.includes(marker)) return desc;
  return `${desc}\n\n${marker}`;
}

function cleanCardDescription(desc: string): string {
  const re = new RegExp(
    `\\s*${MARKER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[a-zA-Z0-9_-]+${MARKER_SUFFIX}`,
    "g",
  );
  return desc.replace(re, "").trim();
}

// ---- Auth helpers ----

function getAuth(integration: TrelloIntegration): TrelloAuth {
  return {
    apiKey: integration.trelloApiKey,
    token: integration.trelloToken,
  };
}

// ---- List Mapping ----

interface ListMapping {
  [status: string]: string; // status -> trelloListId
}

function parseMemberMapping(integration: TrelloIntegration): Record<string, string> {
  return integration.memberMapping || {};
}

function parseMapping(integration: TrelloIntegration): ListMapping {
  return integration.listMapping || {};
}

function reverseMapping(mapping: ListMapping): Record<string, string> {
  const rev: Record<string, string> = {};
  for (const [status, listId] of Object.entries(mapping)) {
    rev[listId] = status;
  }
  return rev;
}

// ---- Sync Logging ----

async function logSync(params: {
  integrationId: string;
  direction: "to_trello" | "from_trello";
  action: "created" | "updated" | "deleted" | "archived";
  taskId?: string;
  trelloCardId?: string;
  status?: "success" | "failed";
  details?: string;
}) {
  try {
    await db.trelloSyncLog.create({
      data: {
        integrationId: params.integrationId,
        direction: params.direction,
        action: params.action,
        taskId: params.taskId || null,
        trelloCardId: params.trelloCardId || null,
        status: params.status || "success",
        details: params.details || null,
      },
    });
  } catch (err) {
    console.error("[TrelloSync] Failed to write sync log:", err);
  }
}

// ---- CORE SYNC OPERATIONS ----

/**
 * Push a new TeamFlow task to Trello (create card).
 */
export async function pushTaskToTrello(
  task: TeamFlowTask,
  integration: TrelloIntegration,
): Promise<{ trelloCardId: string } | { error: string }> {
  const auth = getAuth(integration);
  const mapping = parseMapping(integration);

  try {
    // Determine target list from mapping (default to first list)
    const listId = mapping[task.status];
    if (!listId) {
      // Try to find the first list on the board
      const lists = await Trello.getListsOnBoard(auth, integration.boardId);
      if (lists.length === 0) {
        return { error: "No lists found on the Trello board" };
      }
      const fallbackListId = lists[0].id;
      // Auto-update mapping
      mapping[task.status] = fallbackListId;
      await db.trelloIntegration.update({
        where: { id: integration.id },
        data: { listMapping: mapping },
      });
      const card = await Trello.createCard(auth, {
        idList: fallbackListId,
        name: task.title,
        desc: buildCardDescription(task),
        due: task.dueDate?.toISOString() ?? undefined,
      });
      await logSync({
        integrationId: integration.id,
        direction: "to_trello",
        action: "created",
        taskId: task.id,
        trelloCardId: card.id,
      });
      return { trelloCardId: card.id };
    }

    const card = await Trello.createCard(auth, {
      idList: listId,
      name: task.title,
      desc: buildCardDescription(task),
      due: task.dueDate?.toISOString() ?? undefined,
    });

    // Assign member via mapping
    if (task.assigneeId) {
      const memberMap = parseMemberMapping(integration);
      const trelloMemberId = memberMap[task.assigneeId];
      if (trelloMemberId) {
        await Trello.setCardMembers(auth, card.id, [trelloMemberId]).catch(() => {});
      }
    }

    await logSync({
      integrationId: integration.id,
      direction: "to_trello",
      action: "created",
      taskId: task.id,
      trelloCardId: card.id,
    });

    return { trelloCardId: card.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync({
      integrationId: integration.id,
      direction: "to_trello",
      action: "created",
      taskId: task.id,
      status: "failed",
      details: message,
    });
    return { error: message };
  }
}

/**
 * Update an existing Trello card from a TeamFlow task update.
 * We need the trelloCardId — we look it up by searching cards on the board
 * for the marker or by using a stored mapping.
 */
export async function updateTrelloCard(
  task: TeamFlowTask,
  trelloCardId: string,
  integration: TrelloIntegration,
): Promise<{ success: true } | { error: string }> {
  const auth = getAuth(integration);
  const mapping = parseMapping(integration);

  try {
    const targetListId = mapping[task.status];
    const params: Parameters<typeof Trello.updateCard>[2] = {
      name: task.title,
      desc: buildCardDescription(task),
      due: task.dueDate?.toISOString() ?? null,
    };

    if (targetListId) {
      params.idList = targetListId;
    }

    await Trello.updateCard(auth, trelloCardId, params);

    // Update members (assignee) via memberMapping
    if (task.assigneeId) {
      const memberMap = parseMemberMapping(integration);
      const trelloMemberId = memberMap[task.assigneeId];
      if (trelloMemberId) {
        await Trello.setCardMembers(auth, trelloCardId, [trelloMemberId]);
      }
    }

    await logSync({
      integrationId: integration.id,
      direction: "to_trello",
      action: "updated",
      taskId: task.id,
      trelloCardId,
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync({
      integrationId: integration.id,
      direction: "to_trello",
      action: "updated",
      taskId: task.id,
      trelloCardId,
      status: "failed",
      details: message,
    });
    return { error: message };
  }
}

/**
 * Archive a Trello card when a TeamFlow task is deleted.
 */
export async function archiveTrelloCard(
  task: TeamFlowTask,
  trelloCardId: string,
  integration: TrelloIntegration,
): Promise<{ success: true } | { error: string }> {
  const auth = getAuth(integration);
  try {
    await Trello.archiveCard(auth, trelloCardId);
    await logSync({
      integrationId: integration.id,
      direction: "to_trello",
      action: "archived",
      taskId: task.id,
      trelloCardId,
    });
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync({
      integrationId: integration.id,
      direction: "to_trello",
      action: "archived",
      taskId: task.id,
      trelloCardId,
      status: "failed",
      details: message,
    });
    return { error: message };
  }
}

/**
 * Find a Trello card by the TeamFlow task marker.
 * Returns the card if found, or null.
 */
export async function findTrelloCardByTaskId(
  taskId: string,
  integration: TrelloIntegration,
): Promise<Trello.TrelloCard | null> {
  const auth = getAuth(integration);
  try {
    const lists = await Trello.getListsOnBoard(auth, integration.boardId);
    for (const list of lists) {
      const cards = await Trello.getCardsOnList(auth, list.id);
      for (const card of cards) {
        const extractedId = decodeMarker(card.desc);
        if (extractedId === taskId) {
          return card;
        }
      }
    }
    return null;
  } catch (err) {
    console.error("[TrelloSync] Error searching for card by taskId:", err);
    return null;
  }
}

/**
 * Pull a Trello card update and apply it to the TeamFlow task.
 * Called by the webhook handler.
 */
export async function pullCardUpdateToTask(
  card: Trello.TrelloCard,
  integration: TrelloIntegration,
): Promise<{ taskId: string; updated: boolean } | { error: string }> {
  const taskId = decodeMarker(card.desc);
  if (!taskId) {
    return { error: `No TeamFlow task marker found on Trello card ${card.id}` };
  }

  try {
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return { error: `TeamFlow task ${taskId} not found` };
    }

    // Map Trello list back to status
    const revMapping = reverseMapping(parseMapping(integration));
    const newStatus = revMapping[card.idList] || task.status;

    // Clean the description (remove the marker for display)
    const cleanDesc = cleanCardDescription(card.desc);

    const updated = await db.task.update({
      where: { id: taskId },
      data: {
        title: card.name,
        description: cleanDesc || null,
        status: newStatus,
        dueDate: card.due ? new Date(card.due) : null,
      },
    });

    await logSync({
      integrationId: integration.id,
      direction: "from_trello",
      action: "updated",
      taskId: taskId,
      trelloCardId: card.id,
    });

    return { taskId: updated.id, updated: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync({
      integrationId: integration.id,
      direction: "from_trello",
      action: "updated",
      taskId,
      trelloCardId: card.id,
      status: "failed",
      details: message,
    });
    return { error: message };
  }
}

/**
 * Full pull sync: fetch all cards from Trello and update matching tasks.
 */
export async function fullPullSync(
  integration: TrelloIntegration,
): Promise<{ synced: number; errors: number }> {
  const auth = getAuth(integration);
  let synced = 0;
  let errors = 0;

  try {
    const lists = await Trello.getListsOnBoard(auth, integration.boardId);
    for (const list of lists) {
      const cards = await Trello.getCardsOnList(auth, list.id);
      for (const card of cards) {
        const result = await pullCardUpdateToTask(card, integration);
        if ("error" in result) {
          errors++;
        } else if (result.updated) {
          synced++;
        }
      }
    }
  } catch (err) {
    console.error("[TrelloSync] fullPullSync error:", err);
    errors++;
  }

  // Update lastSyncAt
  await db.trelloIntegration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date() },
  });

  return { synced, errors };
}

/**
 * Full push sync: push all TeamFlow tasks in the workspace to Trello.
 */
export async function fullPushSync(
  integration: TrelloIntegration,
  workspaceId: string,
): Promise<{ created: number; errors: number }> {
  let created = 0;
  let errors = 0;

  try {
    const tasks = await db.task.findMany({
      where: {
        project: { workspaceId },
      },
    });

    for (const task of tasks) {
      // Check if card already exists
      const existing = await findTrelloCardByTaskId(task.id, integration);
      if (existing) {
        // Update instead
        const r = await updateTrelloCard(task, existing.id, integration);
        if ("error" in r) errors++;
        else created++;
      } else {
        const r = await pushTaskToTrello(task, integration);
        if ("error" in r) errors++;
        else created++;
      }
    }
  } catch (err) {
    console.error("[TrelloSync] fullPushSync error:", err);
    errors++;
  }

  await db.trelloIntegration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date() },
  });

  return { created, errors };
}

/**
 * Get or fetch the Trello integration for a workspace.
 */
export async function getIntegration(
  workspaceId: string,
): Promise<TrelloIntegration | null> {
  return db.trelloIntegration.findUnique({
    where: { workspaceId },
  }) as unknown as TrelloIntegration | null;
}

/**
 * Get an integration by workspaceId, throw if not found/disabled.
 */
export async function requireIntegration(
  workspaceId: string,
): Promise<TrelloIntegration | null> {
  const integration = await getIntegration(workspaceId);
  if (!integration || !integration.enabled) return null;
  return integration;
}
