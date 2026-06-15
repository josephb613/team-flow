import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export { getWorkspaceIdFromRequest, buildProjectScopedWhere } from '@/lib/workspace-query';

export function workspaceForbiddenResponse() {
  return NextResponse.json(
    { error: 'Entity does not belong to this workspace' },
    { status: 403 }
  );
}

export async function getProjectWorkspaceId(projectId: string): Promise<string | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  return project?.workspaceId ?? null;
}

export async function assertTaskInWorkspace(
  taskId: string,
  workspaceId: string | null
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!workspaceId) return { ok: true };

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { project: { select: { workspaceId: true } } },
  });

  if (!task) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Task not found' }, { status: 404 }),
    };
  }

  if (task.project.workspaceId !== workspaceId) {
    return { ok: false, response: workspaceForbiddenResponse() };
  }

  return { ok: true };
}

export async function assertProjectInWorkspace(
  projectId: string,
  workspaceId: string | null
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!workspaceId) return { ok: true };

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Project not found' }, { status: 404 }),
    };
  }

  if (project.workspaceId !== workspaceId) {
    return { ok: false, response: workspaceForbiddenResponse() };
  }

  return { ok: true };
}

export async function assertUserInWorkspace(
  userId: string,
  workspaceId: string | null
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!workspaceId) return { ok: true };

  const member = await db.workspaceMember.findFirst({
    where: { userId, workspaceId },
    select: { id: true },
  });

  if (!member) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'User not found in this workspace' }, { status: 404 }),
    };
  }

  return { ok: true };
}

export async function assertSprintInWorkspace(
  sprintId: string,
  workspaceId: string | null
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!workspaceId) return { ok: true };

  const sprint = await db.sprint.findUnique({
    where: { id: sprintId },
    select: { project: { select: { workspaceId: true } } },
  });

  if (!sprint) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Sprint not found' }, { status: 404 }),
    };
  }

  if (sprint.project.workspaceId !== workspaceId) {
    return { ok: false, response: workspaceForbiddenResponse() };
  }

  return { ok: true };
}
