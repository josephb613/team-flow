import { db } from '@/lib/db';
import { triggerReindex } from '@/lib/ai/embeddings/indexer';

export interface LessonEntry {
  taskId: string;
  taskTitle: string;
  resolutionSummary: string;
  lessonsLearned: string;
  tags: string[];
  closedAt: Date;
  closedByName: string;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseExistingEntries(content: string): Map<string, LessonEntry> {
  const map = new Map<string, LessonEntry>();
  const sections = content.split(/\n---\n/).filter(Boolean);

  for (const section of sections) {
    const taskIdMatch = section.match(/\*\*Tâche\s*:\*\*\s*([^\s\n]+)/i)
      ?? section.match(/\*\*Task\s*:\*\*\s*([^\s\n]+)/i);
    if (!taskIdMatch) continue;

    const taskId = taskIdMatch[1].trim();
    const titleMatch = section.match(/^##\s+[\d-]+\s+—\s+(.+)$/m);
    const resolutionMatch = section.match(/###\s+Résolution\s*\n([\s\S]*?)(?=\n###|\n---|$)/i)
      ?? section.match(/###\s+Resolution\s*\n([\s\S]*?)(?=\n###|\n---|$)/i);
    const lessonMatch = section.match(/###\s+Leçon apprise\s*\n([\s\S]*?)(?=\n###|\n---|$)/i)
      ?? section.match(/###\s+Lesson learned\s*\n([\s\S]*?)(?=\n###|\n---|$)/i);
    const authorMatch = section.match(/\*\*Résolu par\s*:\*\*\s*(.+)/i)
      ?? section.match(/\*\*Resolved by\s*:\*\*\s*(.+)/i);
    const dateMatch = section.match(/^##\s+([\d-]+)\s+—/m);
    const tagsMatch = section.match(/\*\*Tags\s*:\*\*\s*(.+)/i);

    map.set(taskId, {
      taskId,
      taskTitle: titleMatch?.[1]?.trim() ?? taskId,
      resolutionSummary: resolutionMatch?.[1]?.trim() ?? '',
      lessonsLearned: lessonMatch?.[1]?.trim() ?? '',
      tags: tagsMatch?.[1]?.split(',').map((t) => t.trim()).filter(Boolean) ?? [],
      closedAt: dateMatch ? new Date(dateMatch[1]) : new Date(),
      closedByName: authorMatch?.[1]?.trim() ?? '',
    });
  }

  return map;
}

export function renderLessonsMarkdown(
  projectName: string,
  entries: LessonEntry[]
): string {
  const sorted = [...entries].sort(
    (a, b) => b.closedAt.getTime() - a.closedAt.getTime()
  );
  const lastUpdated = sorted[0]?.closedAt ?? new Date();

  const lines: string[] = [
    `# Leçons apprises — ${projectName}`,
    `> Dernière MAJ : ${formatDate(lastUpdated)} · ${sorted.length} entrée${sorted.length !== 1 ? 's' : ''}`,
    '',
    '## Sommaire',
    '',
    '| Date | Tâche | Tags | Auteur |',
    '|------|-------|------|--------|',
  ];

  for (const e of sorted) {
    const tagStr = e.tags.length ? e.tags.map((t) => `\`${t}\``).join(' ') : '—';
    lines.push(
      `| ${formatDate(e.closedAt)} | ${e.taskTitle} | ${tagStr} | ${e.closedByName || '—'} |`
    );
  }

  lines.push('', '---', '');

  for (const e of sorted) {
    const tagLine = e.tags.length ? `\n- **Tags :** ${e.tags.join(', ')}` : '';
    lines.push(
      `## ${formatDate(e.closedAt)} — ${e.taskTitle}`,
      `- **Tâche :** ${e.taskId}`,
      `- **Résolu par :** ${e.closedByName || '—'}${tagLine}`,
      '',
      '### Résolution',
      e.resolutionSummary,
      '',
      '### Leçon apprise',
      e.lessonsLearned,
      '',
      '---',
      ''
    );
  }

  return lines.join('\n').trim() + '\n';
}

export async function ensureLessonsWikiPage(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      workspaceId: true,
      lessonsWikiPageId: true,
      lessonsWikiPage: { select: { id: true, content: true } },
    },
  });

  if (!project) throw new Error('Project not found');

  if (project.lessonsWikiPageId && project.lessonsWikiPage) {
    return project.lessonsWikiPage;
  }

  const existing = await db.wikiPage.findFirst({
    where: { projectId, kind: 'lessons_index' },
  });
  if (existing) {
    await db.project.update({
      where: { id: projectId },
      data: { lessonsWikiPageId: existing.id },
    });
    return existing;
  }

  const page = await db.wikiPage.create({
    data: {
      title: `Leçons apprises — ${project.name}`,
      content: renderLessonsMarkdown(project.name, []),
      icon: '💡',
      kind: 'lessons_index',
      projectId,
      workspaceId: project.workspaceId,
    },
  });

  await db.project.update({
    where: { id: projectId },
    data: { lessonsWikiPageId: page.id },
  });

  return page;
}

export async function appendLessonEntry(
  projectId: string,
  entry: LessonEntry
): Promise<string> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, workspaceId: true },
  });
  if (!project) throw new Error('Project not found');

  const wikiPage = await ensureLessonsWikiPage(projectId);
  const existing = parseExistingEntries(wikiPage.content);
  existing.set(entry.taskId, entry);

  const content = renderLessonsMarkdown(project.name, Array.from(existing.values()));

  await db.wikiPage.update({
    where: { id: wikiPage.id },
    data: { content, title: `Leçons apprises — ${project.name}` },
  });

  triggerReindex(project.workspaceId, 'wiki_page', wikiPage.id);

  return wikiPage.id;
}

export async function loadLessonsFromClosedTasks(projectId: string): Promise<LessonEntry[]> {
  const tasks = await db.task.findMany({
    where: {
      projectId,
      status: 'done',
      resolutionSummary: { not: null },
      lessonsLearned: { not: null },
    },
    include: { closedBy: { select: { name: true } } },
    orderBy: { closedAt: 'desc' },
  });

  return tasks.map((task) => ({
    taskId: task.id,
    taskTitle: task.title,
    resolutionSummary: task.resolutionSummary ?? '',
    lessonsLearned: task.lessonsLearned ?? '',
    tags: task.tags ? task.tags.split(',').filter(Boolean) : [],
    closedAt: task.closedAt ?? task.updatedAt,
    closedByName: task.closedBy?.name ?? '',
  }));
}

export async function rebuildProjectLessonsReadme(projectId: string): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, workspaceId: true },
  });
  if (!project) return;

  const wikiPage = await ensureLessonsWikiPage(projectId);
  const entries = await loadLessonsFromClosedTasks(projectId);
  const content = renderLessonsMarkdown(project.name, entries);

  await db.wikiPage.update({
    where: { id: wikiPage.id },
    data: { content },
  });

  triggerReindex(project.workspaceId, 'wiki_page', wikiPage.id);
}
