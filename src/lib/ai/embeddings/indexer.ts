import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { embedBatch } from './embed-batch';
import {
  chunkChangeRequest,
  chunkMeeting,
  chunkProject,
  chunkRisk,
  chunkTask,
  chunkWikiPage,
  computeContentHash,
} from './chunker';
import type { ChunkInput, DocumentSourceType } from './types';
import { vectorSql } from './vector-sql';

async function deleteChunksForSource(sourceType: string, sourceId: string): Promise<void> {
  await db.$executeRaw`
    DELETE FROM "DocumentChunk"
    WHERE "sourceType" = ${sourceType} AND "sourceId" = ${sourceId}
  `;
}

async function getExistingHashes(
  sourceType: string,
  sourceId: string
): Promise<Map<number, string>> {
  const rows = await db.$queryRaw<Array<{ chunkIndex: number; contentHash: string }>>`
    SELECT "chunkIndex", "contentHash"
    FROM "DocumentChunk"
    WHERE "sourceType" = ${sourceType} AND "sourceId" = ${sourceId}
  `;

  const map = new Map<number, string>();
  for (const row of rows) {
    map.set(row.chunkIndex, row.contentHash);
  }
  return map;
}

async function insertChunk(
  workspaceId: string,
  sourceType: DocumentSourceType,
  sourceId: string,
  chunk: ChunkInput,
  embedding: number[],
  contentHash: string
): Promise<void> {
  const id = crypto.randomUUID();
  const metadataJson = JSON.stringify(chunk.metadata ?? {});

  await db.$executeRaw`
    INSERT INTO "DocumentChunk" (
      "id", "workspaceId", "sourceType", "sourceId", "title", "content",
      "chunkIndex", "contentHash", "embedding", "metadata", "indexedAt", "updatedAt"
    ) VALUES (
      ${id},
      ${workspaceId},
      ${sourceType},
      ${sourceId},
      ${chunk.title},
      ${chunk.content},
      ${chunk.chunkIndex},
      ${contentHash},
      ${vectorSql(embedding)},
      ${Prisma.raw(`'${metadataJson.replace(/'/g, "''")}'::jsonb`)},
      NOW(),
      NOW()
    )
  `;
}

async function indexChunks(
  workspaceId: string,
  sourceType: DocumentSourceType,
  sourceId: string,
  chunks: ChunkInput[]
): Promise<number> {
  if (chunks.length === 0) {
    await deleteChunksForSource(sourceType, sourceId);
    return 0;
  }

  const existingHashes = await getExistingHashes(sourceType, sourceId);
  const allMatch =
    chunks.length === existingHashes.size &&
    chunks.every(
      (c) => existingHashes.get(c.chunkIndex) === computeContentHash(c.content)
    );

  if (allMatch) {
    return 0;
  }

  await deleteChunksForSource(sourceType, sourceId);

  const texts = chunks.map((c) => c.content);
  const embeddings = await embedBatch(texts, 'passage');

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    if (!embedding) continue;

    await insertChunk(
      workspaceId,
      sourceType,
      sourceId,
      chunk,
      embedding,
      computeContentHash(chunk.content)
    );
  }

  return chunks.length;
}

async function loadWikiPageChunks(
  workspaceId: string,
  sourceId: string
): Promise<ChunkInput[]> {
  const page = await db.wikiPage.findFirst({
    where: { id: sourceId, workspaceId },
    select: { title: true, content: true },
  });
  if (!page) return [];
  return chunkWikiPage(page.title, page.content);
}

async function loadProjectChunks(
  workspaceId: string,
  sourceId: string
): Promise<ChunkInput[]> {
  const project = await db.project.findFirst({
    where: { id: sourceId, workspaceId },
    select: { name: true, description: true },
  });
  if (!project) return [];
  return chunkProject(project.name, project.description);
}

async function loadTaskChunks(
  workspaceId: string,
  sourceId: string
): Promise<ChunkInput[]> {
  const task = await db.task.findFirst({
    where: { id: sourceId, project: { workspaceId } },
    select: {
      title: true,
      description: true,
      comments: { select: { content: true }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!task) return [];

  const comments = task.comments.map((c) => c.content);
  return chunkTask(task.title, task.description, comments);
}

async function loadChangeRequestChunks(
  workspaceId: string,
  sourceId: string
): Promise<ChunkInput[]> {
  const cr = await db.changeRequest.findFirst({
    where: { id: sourceId, project: { workspaceId } },
    select: { title: true, description: true, decision: true },
  });
  if (!cr) return [];
  return chunkChangeRequest(cr.title, cr.description, cr.decision);
}

async function loadMeetingChunks(
  workspaceId: string,
  sourceId: string
): Promise<ChunkInput[]> {
  const meeting = await db.meeting.findFirst({
    where: {
      id: sourceId,
      OR: [
        { project: { workspaceId } },
        { projectId: null },
      ],
    },
    select: { title: true, description: true, projectId: true, project: { select: { workspaceId: true } } },
  });

  if (!meeting) return [];

  // Meetings without project are not workspace-scoped â€” skip unless linked to workspace project
  if (!meeting.projectId || meeting.project?.workspaceId !== workspaceId) {
    return [];
  }

  return chunkMeeting(meeting.title, meeting.description);
}

async function loadRiskChunks(
  workspaceId: string,
  sourceId: string
): Promise<ChunkInput[]> {
  const risk = await db.risk.findFirst({
    where: { id: sourceId, project: { workspaceId } },
    select: { title: true, description: true, mitigationPlan: true },
  });
  if (!risk) return [];
  return chunkRisk(risk.title, risk.description, risk.mitigationPlan);
}

async function loadChunksForEntity(
  workspaceId: string,
  sourceType: DocumentSourceType,
  sourceId: string
): Promise<ChunkInput[]> {
  switch (sourceType) {
    case 'wiki_page':
      return loadWikiPageChunks(workspaceId, sourceId);
    case 'project':
      return loadProjectChunks(workspaceId, sourceId);
    case 'task':
      return loadTaskChunks(workspaceId, sourceId);
    case 'change_request':
      return loadChangeRequestChunks(workspaceId, sourceId);
    case 'meeting':
      return loadMeetingChunks(workspaceId, sourceId);
    case 'risk':
      return loadRiskChunks(workspaceId, sourceId);
    default:
      return [];
  }
}

export async function reindexEntity(
  workspaceId: string,
  sourceType: DocumentSourceType,
  sourceId: string
): Promise<number> {
  const chunks = await loadChunksForEntity(workspaceId, sourceType, sourceId);
  return indexChunks(workspaceId, sourceType, sourceId, chunks);
}

export function triggerReindex(
  workspaceId: string,
  sourceType: DocumentSourceType,
  sourceId: string
): void {
  void reindexEntity(workspaceId, sourceType, sourceId).catch((error) => {
    console.error(`Reindex failed for ${sourceType}/${sourceId}:`, error);
  });
}

export interface IndexWorkspaceResult {
  workspaceId: string;
  indexed: number;
  skipped: number;
  byType: Record<string, number>;
}

export async function indexWorkspace(workspaceId: string): Promise<IndexWorkspaceResult> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  const result: IndexWorkspaceResult = {
    workspaceId,
    indexed: 0,
    skipped: 0,
    byType: {},
  };

  const wikiPages = await db.wikiPage.findMany({
    where: { workspaceId },
    select: { id: true },
  });

  for (const page of wikiPages) {
    const count = await reindexEntity(workspaceId, 'wiki_page', page.id);
    result.byType.wiki_page = (result.byType.wiki_page ?? 0) + count;
    if (count > 0) result.indexed += count;
    else result.skipped += 1;
  }

  const projects = await db.project.findMany({
    where: { workspaceId },
    select: { id: true },
  });

  for (const project of projects) {
    const count = await reindexEntity(workspaceId, 'project', project.id);
    result.byType.project = (result.byType.project ?? 0) + count;
    if (count > 0) result.indexed += count;
    else result.skipped += 1;
  }

  const tasks = await db.task.findMany({
    where: { project: { workspaceId } },
    select: { id: true },
  });

  for (const task of tasks) {
    const count = await reindexEntity(workspaceId, 'task', task.id);
    result.byType.task = (result.byType.task ?? 0) + count;
    if (count > 0) result.indexed += count;
    else result.skipped += 1;
  }

  const changeRequests = await db.changeRequest.findMany({
    where: { project: { workspaceId } },
    select: { id: true },
  });

  for (const cr of changeRequests) {
    const count = await reindexEntity(workspaceId, 'change_request', cr.id);
    result.byType.change_request = (result.byType.change_request ?? 0) + count;
    if (count > 0) result.indexed += count;
    else result.skipped += 1;
  }

  const meetings = await db.meeting.findMany({
    where: { project: { workspaceId } },
    select: { id: true },
  });

  for (const meeting of meetings) {
    const count = await reindexEntity(workspaceId, 'meeting', meeting.id);
    result.byType.meeting = (result.byType.meeting ?? 0) + count;
    if (count > 0) result.indexed += count;
    else result.skipped += 1;
  }

  const risks = await db.risk.findMany({
    where: { project: { workspaceId } },
    select: { id: true },
  });

  for (const risk of risks) {
    const count = await reindexEntity(workspaceId, 'risk', risk.id);
    result.byType.risk = (result.byType.risk ?? 0) + count;
    if (count > 0) result.indexed += count;
    else result.skipped += 1;
  }

  return result;
}

