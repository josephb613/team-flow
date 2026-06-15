import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Critical Path Method (CPM): forward/backward pass over the dependency graph.
// Duration in days comes from start/due dates, falling back to estimatedHours / 8.

interface CpmNode {
  id: string;
  title: string;
  status: string;
  priority: string;
  duration: number;
  es: number; // earliest start
  ef: number; // earliest finish
  ls: number; // latest start
  lf: number; // latest finish
  slack: number;
  critical: boolean;
  predecessorIds: string[];
  successorIds: string[];
  assigneeName: string | null;
  startDate: string | null;
  dueDate: string | null;
}

function taskDurationDays(task: { startDate: Date | null; dueDate: Date | null; estimatedHours: number }): number {
  if (task.startDate && task.dueDate && task.dueDate > task.startDate) {
    return Math.max(1, Math.round((task.dueDate.getTime() - task.startDate.getTime()) / 86400000));
  }
  if (task.estimatedHours > 0) {
    return Math.max(1, Math.ceil(task.estimatedHours / 8));
  }
  return 1;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const [tasks, dependencies] = await Promise.all([
      db.task.findMany({
        where: { projectId },
        include: { assignee: { select: { name: true } } },
      }),
      db.taskDependency.findMany({
        where: { predecessor: { projectId } },
        select: { predecessorId: true, successorId: true, lagDays: true, type: true, id: true },
      }),
    ]);

    const nodes = new Map<string, CpmNode>();
    for (const task of tasks) {
      nodes.set(task.id, {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        duration: taskDurationDays(task),
        es: 0,
        ef: 0,
        ls: Infinity,
        lf: Infinity,
        slack: 0,
        critical: false,
        predecessorIds: [],
        successorIds: [],
        assigneeName: task.assignee?.name ?? null,
        startDate: task.startDate?.toISOString() ?? null,
        dueDate: task.dueDate?.toISOString() ?? null,
      });
    }

    const lagOf = new Map<string, number>();
    for (const dep of dependencies) {
      const pred = nodes.get(dep.predecessorId);
      const succ = nodes.get(dep.successorId);
      if (!pred || !succ) continue;
      pred.successorIds.push(succ.id);
      succ.predecessorIds.push(pred.id);
      lagOf.set(`${pred.id}->${succ.id}`, dep.lagDays);
    }

    // Topological sort (Kahn). The POST /api/dependencies guard prevents cycles.
    const inDegree = new Map<string, number>();
    for (const node of nodes.values()) inDegree.set(node.id, node.predecessorIds.length);
    const queue: string[] = [...nodes.values()].filter((n) => n.predecessorIds.length === 0).map((n) => n.id);
    const topo: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      topo.push(id);
      for (const succId of nodes.get(id)!.successorIds) {
        const deg = (inDegree.get(succId) ?? 1) - 1;
        inDegree.set(succId, deg);
        if (deg === 0) queue.push(succId);
      }
    }

    // Forward pass
    for (const id of topo) {
      const node = nodes.get(id)!;
      node.es = node.predecessorIds.reduce((max, predId) => {
        const pred = nodes.get(predId)!;
        return Math.max(max, pred.ef + (lagOf.get(`${predId}->${id}`) ?? 0));
      }, 0);
      node.ef = node.es + node.duration;
    }

    const projectDuration = Math.max(0, ...[...nodes.values()].map((n) => n.ef));

    // Backward pass
    for (const id of [...topo].reverse()) {
      const node = nodes.get(id)!;
      node.lf = node.successorIds.length === 0
        ? projectDuration
        : node.successorIds.reduce((min, succId) => {
            const succ = nodes.get(succId)!;
            return Math.min(min, succ.ls - (lagOf.get(`${id}->${succId}`) ?? 0));
          }, Infinity);
      node.ls = node.lf - node.duration;
      node.slack = node.ls - node.es;
      node.critical = node.slack <= 0;
    }

    const result = [...nodes.values()].sort((a, b) => a.es - b.es || b.duration - a.duration);
    const criticalPath = result.filter((n) => n.critical).map((n) => n.id);

    return NextResponse.json({
      projectId,
      projectDuration,
      criticalPath,
      dependencies,
      tasks: result,
    });
  } catch (error) {
    console.error('GET /api/critical-path error:', error);
    return NextResponse.json({ error: 'Failed to compute critical path' }, { status: 500 });
  }
}
