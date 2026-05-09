import { db } from "@/lib/db";

export interface LogActivityParams {
  type: string;
  userId: string;
  description: string;
  workspaceId: string;
  targetId?: string;
  targetType?: string;
}

/**
 * Crée une entrée dans la table ActivityLog.
 * Non-bloquant : les erreurs sont loggées mais jamais propagées.
 */
export function logActivity(params: LogActivityParams): void {
  const { type, userId, description, workspaceId, targetId, targetType } =
    params;

  db.activityLog
    .create({
      data: {
        type,
        userId,
        description,
        workspaceId,
        targetId: targetId ?? null,
        targetType: targetType ?? null,
      },
    })
    .catch((error) => {
      console.error("[ActivityLog] Failed to create log:", error);
    });
}
