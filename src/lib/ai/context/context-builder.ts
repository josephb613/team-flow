import { db } from '@/lib/db';
import type { ContextBuilderOptions } from '../types';
import { summarizeTasks } from './summarize-tasks';
import { summarizeProjects } from './summarize-projects';
import { summarizeSprints } from './summarize-sprints';
import { summarizeRisks } from './summarize-risks';
import { summarizeStakeholders } from './summarize-stakeholders';
import { truncateToTokenBudget } from './token-budget';

export async function validateWorkspace(workspaceId: string): Promise<{ id: string; name: string }> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  });

  if (!workspace) {
    console.error('[ai/chat] Workspace not found:', workspaceId);
    throw new Error('Workspace not found');
  }

  return workspace;
}

export async function buildWorkspaceContext(options: ContextBuilderOptions): Promise<string> {
  await validateWorkspace(options.workspaceId);

  const [workspace, tasks, projects, sprints, risks, stakeholders] = await Promise.all([
    db.workspace.findUnique({
      where: { id: options.workspaceId },
      select: { name: true },
    }),
    summarizeTasks(options),
    summarizeProjects(options),
    summarizeSprints(options),
    summarizeRisks(options),
    summarizeStakeholders(options),
  ]);

  const sections = [
    `=== Workspace: ${workspace?.name ?? options.workspaceId} ===`,
    options.projectId ? `Focus project ID: ${options.projectId}` : '',
    '',
    '--- Tasks ---',
    tasks,
    '',
    '--- Projects ---',
    projects,
    '',
    '--- Sprints ---',
    sprints,
    '',
    '--- Risks ---',
    risks,
    '',
    '--- Stakeholders ---',
    stakeholders,
  ].filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''));

  return truncateToTokenBudget(sections.join('\n'));
}
