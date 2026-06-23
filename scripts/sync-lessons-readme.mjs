/**
 * Export lessons-learned README files for all projects in a workspace.
 * Usage: bun scripts/sync-lessons-readme.mjs <workspaceId> [--out docs/learnings/]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { db } from '../src/lib/db.ts';
import { rebuildProjectLessonsReadme } from '../src/lib/lessons/lessons-readme.ts';

const workspaceId = process.argv[2];
const outIdx = process.argv.indexOf('--out');
const outDir = outIdx >= 0 ? process.argv[outIdx + 1] : 'docs/learnings';

if (!workspaceId) {
  console.error('Usage: bun scripts/sync-lessons-readme.mjs <workspaceId> [--out docs/learnings/]');
  process.exit(1);
}

try {
  const projects = await db.project.findMany({
    where: { workspaceId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  await mkdir(outDir, { recursive: true });

  let exported = 0;
  for (const project of projects) {
    await rebuildProjectLessonsReadme(project.id);

    const page = await db.wikiPage.findFirst({
      where: { projectId: project.id, kind: 'lessons_index' },
      select: { content: true },
    });

    if (!page?.content?.trim()) continue;

    const slug = project.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || project.id;
    const filePath = join(outDir, `${slug}-LESSONS_LEARNED.md`);
    await writeFile(filePath, page.content, 'utf8');
    exported += 1;
    console.log(`Wrote ${filePath}`);
  }

  console.log(JSON.stringify({ workspaceId, projects: projects.length, exported, outDir }, null, 2));
} catch (error) {
  console.error('Sync failed:', error);
  process.exit(1);
} finally {
  await db.$disconnect();
}
