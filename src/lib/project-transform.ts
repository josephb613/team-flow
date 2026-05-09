import type { Project, Task } from "./types";

/**
 * Transforme les données brutes Prisma d'un projet (avec tasks, meetings, etc.)
 * en un objet Project typé côté frontend avec les champs calculés.
 *
 * Les champs `taskCount`, `completedTasks`, `progress`, `members` n'existent pas
 * en base — ils sont dérivés des relations (tasks, assignees).
 * On conserve aussi le tableau `tasks` pour l'affichage dans le drawer.
 */
export interface PrismaProjectWithRelations {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  status: string;
  dueDate: Date | string | null;
  createdAt: Date | string;
  workspaceId: string;
  tasks?: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    tags: string;
    dueDate: Date | string | null;
    createdAt: Date | string;
    assigneeId: string | null;
    creatorId: string | null;
    projectId: string;
    assignee?: { id: string; name?: string; email?: string } | null;
    subtasks?: Array<{
      id: string;
      title: string;
      completed: boolean;
    }>;
  }>;
  meetings?: Array<unknown>;
  workspace?: {
    members?: Array<{ userId: string; user?: { id: string; name?: string } }>;
  };
}

/** Version enrichie de Project qui inclut le tableau de tâches */
export interface ProjectWithTasks extends Project {
  tasks: Task[];
}

function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString();
  return d;
}

export function transformProject(raw: PrismaProjectWithRelations): ProjectWithTasks {
  const rawTasks = raw.tasks ?? [];
  const taskCount = rawTasks.length;
  const completedTasks = rawTasks.filter((t) => t.status === "done").length;
  const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

  // Membres = assignees uniques des tâches du projet
  const memberSet = new Set<string>();
  for (const t of rawTasks) {
    if (t.assigneeId) memberSet.add(t.assigneeId);
  }
  // Fallback: workspace members si aucune tâche assignée
  if (memberSet.size === 0 && raw.workspace?.members) {
    for (const m of raw.workspace.members) {
      memberSet.add(m.userId);
    }
  }

  // Transformer les tâches au format Task
  const tasks: Task[] = rawTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    status: t.status as Task["status"],
    priority: t.priority as Task["priority"],
    assigneeId: t.assigneeId ?? "",
    projectId: t.projectId,
    tags: t.tags ? t.tags.split(",").filter(Boolean) : [],
    dueDate: toDateStr(t.dueDate),
    createdAt: toDateStr(t.createdAt),
    subtasks: (t.subtasks ?? []).map((st) => ({
      id: st.id,
      title: st.title,
      completed: st.completed,
    })),
  }));

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? "",
    color: raw.color,
    icon: raw.icon,
    status: raw.status as Project["status"],
    progress,
    members: Array.from(memberSet),
    taskCount,
    completedTasks,
    dueDate: toDateStr(raw.dueDate),
    createdAt: toDateStr(raw.createdAt),
    tasks,
  };
}
