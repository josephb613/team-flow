import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { updateTaskSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";

export const GET = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;

    const task = await db.task.findFirst({
      where: {
        id,
        project: {
          workspace: {
            members: { some: { userId: user.id } },
          },
        },
      },
      include: {
        assignee: true,
        creator: true,
        subtasks: true,
        project: true,
        comments: {
          include: { user: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  }),
);

export const PATCH = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const body = await request.json();

    const validation = validateBody(updateTaskSchema, body);
    if (validation.error) return validation.error;

    // Verify ownership
    const existing = await db.task.findFirst({
      where: {
        id,
        project: {
          workspace: {
            members: { some: { userId: user.id } },
          },
        },
      },
      select: {
        title: true,
        status: true,
        project: { select: { workspaceId: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { tags, dueDate, ...rest } = validation.data;

    const task = await db.task.update({
      where: { id },
      data: {
        ...rest,
        ...(tags !== undefined && {
          tags: Array.isArray(tags) ? tags.join(",") : tags,
        }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
      },
      include: {
        assignee: true,
        creator: true,
        subtasks: true,
        project: true,
      },
    });

    // Log d'activité non-bloquant — détecter le type selon le changement de statut
    const newStatus = validation.data.status;
    let activityType = "task_updated";
    let description = `updated "${task.title}"`;

    if (newStatus && newStatus !== existing.status) {
      if (newStatus === "done") {
        activityType = "task_completed";
        description = `completed "${task.title}"`;
      } else if (existing.status === "done") {
        activityType = "task_reopened";
        description = `reopened "${task.title}"`;
      }
    }

    logActivity({
      type: activityType,
      userId: user.id,
      description,
      workspaceId: existing.project.workspaceId,
      targetId: task.id,
      targetType: "task",
    });

    return NextResponse.json(task);
  }),
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;

    const existing = await db.task.findFirst({
      where: {
        id,
        project: {
          workspace: {
            members: { some: { userId: user.id } },
          },
        },
      },
      select: {
        title: true,
        project: { select: { workspaceId: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await db.task.delete({ where: { id } });

    // Log d'activité non-bloquant
    logActivity({
      type: "task_deleted",
      userId: user.id,
      description: `deleted "${existing.title}"`,
      workspaceId: existing.project.workspaceId,
      targetId: id,
      targetType: "task",
    });

    return NextResponse.json({ message: "Task deleted successfully" });
  }),
);
