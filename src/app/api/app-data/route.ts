import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapAppDataPayload } from '@/lib/data-mappers';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get('workspaceId') ?? undefined;

    if (!workspaceId) {
      console.warn('GET /api/app-data: workspaceId missing — returning all data (deprecated)');
    }

    const projectWhere = workspaceId ? { workspaceId } : undefined;
    const teamWhere = workspaceId ? { workspaceId } : undefined;
    const channelWhere = workspaceId ? { workspaceId } : undefined;
    const automationWhere = workspaceId ? { workspaceId } : undefined;
    const activityWhere = workspaceId ? { workspaceId } : undefined;

    const [
      users,
      projects,
      tasks,
      workspaces,
      sprints,
      milestones,
      timeEntries,
      automations,
      activityLogs,
      teams,
      channels,
      meetings,
    ] = await Promise.all([
      db.user.findMany({
        where: workspaceId
          ? { workspaceMembers: { some: { workspaceId } } }
          : undefined,
        include: {
          assignedTasks: { select: { id: true } },
          workspaceMembers: {
            where: workspaceId ? { workspaceId } : undefined,
            orderBy: { joinedAt: 'asc' },
            include: { workspace: { select: { id: true, name: true } } },
          },
        },
        orderBy: { name: 'asc' },
      }),
      db.project.findMany({
        where: projectWhere,
        include: { tasks: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.task.findMany({
        where: workspaceId ? { project: { workspaceId } } : undefined,
        include: {
          subtasks: true,
          project: { select: { workspaceId: true } },
          timeEntries: { select: { hours: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.workspace.findMany({
        include: {
          members: { select: { userId: true } },
          projects: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.sprint.findMany({
        where: workspaceId ? { project: { workspaceId } } : undefined,
        include: {
          tasks: { select: { id: true } },
          project: { select: { workspaceId: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.milestone.findMany({
        where: workspaceId ? { project: { workspaceId } } : undefined,
        include: {
          tasks: { select: { id: true } },
          project: { select: { workspaceId: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      db.timeEntry.findMany({
        where: workspaceId ? { project: { workspaceId } } : undefined,
        orderBy: { date: 'desc' },
      }),
      db.automation.findMany({
        where: automationWhere,
        orderBy: { createdAt: 'desc' },
      }),
      db.activityLog.findMany({
        where: activityWhere,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.team.findMany({
        where: teamWhere,
        include: { teamMembers: { select: { userId: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.channel.findMany({
        where: channelWhere,
        include: { channelMembers: { select: { userId: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.meeting.findMany({
        where: workspaceId ? { project: { workspaceId } } : undefined,
        include: { meetingMembers: { select: { userId: true } } },
        orderBy: { date: 'asc' },
      }),
    ]);

    const payload = mapAppDataPayload(
      {
        users,
        projects,
        tasks,
        workspaces,
        sprints,
        milestones,
        timeEntries,
        automations,
        activityLogs,
        teams,
        channels,
        meetings,
      },
      workspaceId
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error('GET /api/app-data error:', error);
    return NextResponse.json({ error: 'Failed to fetch app data' }, { status: 500 });
  }
}
