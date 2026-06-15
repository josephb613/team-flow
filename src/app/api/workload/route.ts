import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getWorkspaceIdFromRequest } from '@/lib/workspace-api';

// Resource workload: open estimated hours per assignee vs weekly capacity
export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);

    const users = await db.user.findMany({
      where: workspaceId
        ? { workspaceMembers: { some: { workspaceId } } }
        : undefined,
      include: {
        assignedTasks: {
          where: {
            status: { not: 'done' },
            ...(workspaceId ? { project: { workspaceId } } : {}),
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            estimatedHours: true,
            dueDate: true,
            project: { select: { id: true, name: true, color: true, icon: true } },
          },
        },
        timeEntries: {
          where: workspaceId ? { project: { workspaceId } } : undefined,
          select: { hours: true, date: true },
        },
      },
    });

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const workload = users.map((user) => {
      const openHours = user.assignedTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
      const loggedThisWeek = user.timeEntries
        .filter((e) => e.date >= weekStart)
        .reduce((sum, e) => sum + e.hours, 0);
      const utilization = user.weeklyCapacity > 0 ? (openHours / user.weeklyCapacity) * 100 : 0;

      let level: 'under' | 'optimal' | 'over' = 'optimal';
      if (utilization < 60) level = 'under';
      else if (utilization > 100) level = 'over';

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        weeklyCapacity: user.weeklyCapacity,
        openTaskCount: user.assignedTasks.length,
        openHours,
        loggedThisWeek,
        utilization,
        level,
        tasks: user.assignedTasks,
      };
    });

    workload.sort((a, b) => b.utilization - a.utilization);
    return NextResponse.json(workload);
  } catch (error) {
    console.error('GET /api/workload error:', error);
    return NextResponse.json({ error: 'Failed to compute workload' }, { status: 500 });
  }
}
