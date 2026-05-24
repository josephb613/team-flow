import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, normalizeTaskTags } from "@/lib/api-utils";

/**
 * Bootstrap endpoint - Returns all initial data needed for the app in a single request.
 * This eliminates the waterfall of sequential API calls on first load.
 * 
 * Returns:
 * - workspaces (with members, projects, columns)
 * - users (for the active workspace)
 * - channels (for the active workspace)
 * - tasks (for the active workspace, limited to recent 100)
 * - projects (for the active workspace)
 * - notifications (unread, limited to 20)
 */
export const GET = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const { searchParams } = new URL(request.url);
    const requestedWorkspaceId = searchParams.get("workspaceId");

    // 1. Fetch all workspaces the user belongs to
    const workspaces = await db.workspace.findMany({
      where: {
        members: {
          some: { userId: user.id },
        },
      },
      include: {
        members: {
          include: { user: true },
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        columns: { orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Determine active workspace
    const activeWorkspaceId = requestedWorkspaceId || workspaces[0]?.id;

    if (!activeWorkspaceId) {
      // User has no workspaces yet
      return NextResponse.json(
        {
          workspaces: [],
          activeWorkspaceId: null,
          users: [],
          channels: [],
          tasks: [],
          projects: [],
          notifications: [],
          columns: { tasks: [], opportunities: [] },
        },
        {
          headers: {
            "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
          },
        }
      );
    }

    // Verify user has access to the requested workspace
    const hasAccess = workspaces.some((w) => w.id === activeWorkspaceId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 403 }
      );
    }

    // 2. Extract columns from workspace (already fetched above)
    const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
    const allColumns = activeWorkspace?.columns || [];
    const taskColumns = allColumns.filter((c) => c.boardType === "tasks");
    const oppColumns = allColumns.filter((c) => c.boardType === "opportunities");

    // 3. Fetch remaining data in batches to avoid connection pool exhaustion
    // First batch: lightweight queries
    const [users, channels] = await Promise.all([
      db.userProfile.findMany({
        where: {
          workspaceMembers: {
            some: { workspaceId: activeWorkspaceId },
          },
        },
        select: {
          neonAuthUserId: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          status: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      }),
      db.channel.findMany({
        where: { workspaceId: activeWorkspaceId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Second batch: heavier queries
    const [tasks, projects] = await Promise.all([
      db.task.findMany({
        where: {
          project: { workspaceId: activeWorkspaceId },
        },
        include: {
          assignee: {
            select: { neonAuthUserId: true, name: true, avatar: true },
          },
          subtasks: true,
          project: {
            select: { id: true, name: true },
          },
          phase: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.project.findMany({
        where: { workspaceId: activeWorkspaceId },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Map users to frontend format
    const mappedUsers = users.map((u) => ({
      id: u.neonAuthUserId,
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
    }));

    // Normalize task tags
    const normalizedTasks = tasks.map(normalizeTaskTags);

    return NextResponse.json(
      {
        workspaces,
        activeWorkspaceId,
        users: mappedUsers,
        channels,
        tasks: normalizedTasks,
        projects,
        notifications: [], // TODO: Add Notification model to schema when needed
        columns: {
          tasks: taskColumns,
          opportunities: oppColumns,
        },
        _meta: {
          timestamp: Date.now(),
          userId: user.id,
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  })
);
