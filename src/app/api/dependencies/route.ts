import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const workspaceId = getWorkspaceIdFromRequest(request);

    const dependencies = await db.taskDependency.findMany({
      where: projectId
        ? { predecessor: { projectId } }
        : workspaceId
          ? { predecessor: { project: { workspaceId } } }
          : undefined,
      include: {
        predecessor: { select: { id: true, title: true, status: true, projectId: true } },
        successor: { select: { id: true, title: true, status: true, projectId: true } },
      },
    });
    return NextResponse.json(dependencies);
  } catch (error) {
    console.error('GET /api/dependencies error:', error);
    return NextResponse.json({ error: 'Failed to fetch dependencies' }, { status: 500 });
  }
}

// Detect whether adding predecessorId -> successorId would create a cycle
async function wouldCreateCycle(predecessorId: string, successorId: string): Promise<boolean> {
  if (predecessorId === successorId) return true;
  const all = await db.taskDependency.findMany({
    select: { predecessorId: true, successorId: true },
  });
  const graph = new Map<string, string[]>();
  for (const dep of all) {
    const list = graph.get(dep.predecessorId) || [];
    list.push(dep.successorId);
    graph.set(dep.predecessorId, list);
  }
  // BFS from successor: if we can reach predecessor, adding the edge creates a cycle
  const queue = [successorId];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === predecessorId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of graph.get(current) || []) queue.push(next);
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { predecessorId, successorId, type, lagDays } = body;

    if (!predecessorId || !successorId) {
      return NextResponse.json({ error: 'predecessorId and successorId are required' }, { status: 400 });
    }

    if (await wouldCreateCycle(predecessorId, successorId)) {
      return NextResponse.json({ error: 'Cette dépendance créerait un cycle' }, { status: 409 });
    }

    const dependency = await db.taskDependency.create({
      data: {
        predecessorId,
        successorId,
        type: type || 'FS',
        lagDays: lagDays ?? 0,
      },
      include: {
        predecessor: { select: { id: true, title: true, status: true, projectId: true } },
        successor: { select: { id: true, title: true, status: true, projectId: true } },
      },
    });

    return NextResponse.json(dependency, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Cette dépendance existe déjà' }, { status: 409 });
    }
    console.error('POST /api/dependencies error:', error);
    return NextResponse.json({ error: 'Failed to create dependency' }, { status: 500 });
  }
}
