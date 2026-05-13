import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createTaskSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";

export const GET = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    const whereClause: any = {
      project: {
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
    };

    if (workspaceId) {
      const membership = await db.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId,
          },
        },
      });
      if (!membership) {
        return NextResponse.json(
          { error: "Workspace not found or access denied" },
          { status: 403 },
        );
      }
      whereClause.project.workspaceId = workspaceId;
    }

    const tasks = await db.task.findMany({
      where: whereClause,
      include: {
        assignee: true,
        creator: true,
        subtasks: true,
        project: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tasks);
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const body = await request.json();

    const validation = validateBody(createTaskSchema, body);
    if (validation.error) return validation.error;

    const {
      title,
      description,
      status,
      priority,
      tags,
      dueDate,
      projectId,
      assigneeId,
      subtasks: subtaskInput,
    } = validation.data;

    // Verify the project belongs to a workspace the user is a member of
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
      select: { workspaceId: true },
    });
    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 },
      );
    }

    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        status: status || "todo",
        priority: priority || "medium",
        tags: tags ? tags.join(",") : "",
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        assigneeId: assigneeId || null,
        creatorId: user.id,
        ...(subtaskInput && subtaskInput.length > 0 && {
          subtasks: {
            create: subtaskInput,
          },
        }),
      },
      include: {
        assignee: true,
        subtasks: true,
        project: true,
      },
    });

    // Log d'activité non-bloquant
    logActivity({
      type: "task_created",
      userId: user.id,
      description: `created "${title}"`,
      workspaceId: project.workspaceId,
      targetId: task.id,
      targetType: "task",
    });

    return NextResponse.json(task, { status: 201 });
  }),
);
