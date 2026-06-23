import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export { getWorkspaceIdFromRequest, buildProjectScopedWhere } from '@/lib/workspace-query';

export function workspaceForbiddenResponse() {
  return NextResponse.json(
    { error: 'Entity does not belong to this workspace' },
    { status: 403 }
  );
}

export function workspaceIdRequiredResponse() {
  return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
}

export async function getProjectWorkspaceId(projectId: string): Promise<string | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  return project?.workspaceId ?? null;
}

function missingWorkspaceIdFailure(): { ok: false; response: NextResponse } {
  return { ok: false, response: workspaceIdRequiredResponse() };
}

export async function assertWorkspaceMembership(
  workspaceId: string | null,
  userId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!workspaceId) return missingWorkspaceIdFailure();

  const member = await db.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { id: true },
  });

  if (!member) {
    return { ok: false, response: workspaceForbiddenResponse() };
  }

  return { ok: true };
}

export async function assertTaskInWorkspace(
  taskId: string,
  workspaceId: string | null
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!workspaceId) return missingWorkspaceIdFailure();

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
  if (!workspaceId) return missingWorkspaceIdFailure();

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
  if (!workspaceId) return missingWorkspaceIdFailure();

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
  if (!workspaceId) return missingWorkspaceIdFailure();

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

export async function assertWikiPageInWorkspace(
  wikiPageId: string,
  workspaceId: string | null
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!workspaceId) return missingWorkspaceIdFailure();

  const page = await db.wikiPage.findUnique({
    where: { id: wikiPageId },
    select: { workspaceId: true },
  });

  if (!page) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Wiki page not found' }, { status: 404 }),
    };
  }

  if (page.workspaceId !== workspaceId) {
    return { ok: false, response: workspaceForbiddenResponse() };
  }

  return { ok: true };
}

export async function assertRiskInWorkspace(
  riskId: string,
  workspaceId: string | null
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!workspaceId) return missingWorkspaceIdFailure();

  const risk = await db.risk.findUnique({
    where: { id: riskId },
    select: { project: { select: { workspaceId: true } } },
  });

  if (!risk) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Risk not found' }, { status: 404 }),
    };
  }

  if (risk.project.workspaceId !== workspaceId) {
    return { ok: false, response: workspaceForbiddenResponse() };
  }

  return { ok: true };
}

export async function assertStakeholderInWorkspace(
  stakeholderId: string,
  workspaceId: string | null
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!workspaceId) return missingWorkspaceIdFailure();

  const stakeholder = await db.stakeholder.findUnique({
    where: { id: stakeholderId },
    select: { project: { select: { workspaceId: true } } },
  });

  if (!stakeholder) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 }),
    };
  }

  if (stakeholder.project.workspaceId !== workspaceId) {
    return { ok: false, response: workspaceForbiddenResponse() };
  }

  return { ok: true };
}

export async function assertBaselineInWorkspace(
  baselineId: string,
  workspaceId: string | null
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!workspaceId) return missingWorkspaceIdFailure();

  const baseline = await db.baseline.findUnique({
    where: { id: baselineId },
    select: { project: { select: { workspaceId: true } } },
  });

  if (!baseline) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Baseline not found' }, { status: 404 }),
    };
  }

  if (baseline.project.workspaceId !== workspaceId) {
    return { ok: false, response: workspaceForbiddenResponse() };
  }

  return { ok: true };
}

export async function assertChangeRequestInWorkspace(
  changeRequestId: string,
  workspaceId: string | null
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!workspaceId) return missingWorkspaceIdFailure();

  const changeRequest = await db.changeRequest.findUnique({
    where: { id: changeRequestId },
    select: { project: { select: { workspaceId: true } } },
  });

  if (!changeRequest) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Change request not found' }, { status: 404 }),
    };
  }

  if (changeRequest.project.workspaceId !== workspaceId) {
    return { ok: false, response: workspaceForbiddenResponse() };
  }

  return { ok: true };
}

export async function assertTaskDependencyInWorkspace(
  dependencyId: string,
  workspaceId: string | null
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!workspaceId) return missingWorkspaceIdFailure();

  const dependency = await db.taskDependency.findUnique({
    where: { id: dependencyId },
    select: {
      predecessor: { select: { project: { select: { workspaceId: true } } } },
    },
  });

  if (!dependency) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Dependency not found' }, { status: 404 }),
    };
  }

  if (dependency.predecessor.project.workspaceId !== workspaceId) {
    return { ok: false, response: workspaceForbiddenResponse() };
  }

  return { ok: true };
}

export async function assertTimeEntryInWorkspace(
  timeEntryId: string,
  workspaceId: string | null
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!workspaceId) return missingWorkspaceIdFailure();

  const timeEntry = await db.timeEntry.findUnique({
    where: { id: timeEntryId },
    select: { project: { select: { workspaceId: true } } },
  });

  if (!timeEntry) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Time entry not found' }, { status: 404 }),
    };
  }

  if (timeEntry.project.workspaceId !== workspaceId) {
    return { ok: false, response: workspaceForbiddenResponse() };
  }

  return { ok: true };
}
