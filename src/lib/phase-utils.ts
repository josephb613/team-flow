import { db } from "@/lib/db";

/**
 * Recalcule la progression (0-100) d'une phase en fonction du statut
 * de ses tâches. La progression = (tâches "done" / total tâches) * 100.
 *
 * @returns La nouvelle valeur de progression, ou 0 si aucune tâche.
 */
export async function recalculatePhaseProgress(
  phaseId: string,
): Promise<number> {
  const tasks = await db.task.findMany({
    where: { phaseId },
    select: { status: true },
  });

  if (tasks.length === 0) return 0;

  const doneCount = tasks.filter((t) => t.status === "done").length;
  return Math.round((doneCount / tasks.length) * 100);
}

/**
 * Met à jour le champ `progress` de la phase spécifiée dans la base.
 * Appelée après toute mutation de tâche qui affecte une phase.
 *
 * @returns La phase mise à jour, ou null si la phase n'existe pas.
 */
export async function updatePhaseProgress(
  phaseId: string,
): Promise<void> {
  const progress = await recalculatePhaseProgress(phaseId);

  await db.projectPhase.update({
    where: { id: phaseId },
    data: { progress },
  });
}

/**
 * Recalcule et met à jour la progression pour chaque phase passée en argument.
 * Utile quand une tâche change de phase (l'ancienne et la nouvelle sont impactées).
 */
export async function updatePhasesProgress(
  phaseIds: (string | null | undefined)[],
): Promise<void> {
  const ids = phaseIds.filter((id): id is string => !!id);
  // Déduplication
  const uniqueIds = [...new Set(ids)];
  await Promise.all(uniqueIds.map((id) => updatePhaseProgress(id)));
}
