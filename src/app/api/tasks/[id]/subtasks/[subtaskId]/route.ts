import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { updateSubtaskSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";

export const PATCH = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id: taskId, subtaskId } = await (context as {
      params: Promise<{ id: string; subtaskId: string }>;
    }).params;

    // Verify the task exists and belongs to a workspace the user has access to
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        project: {
          workspace: {
            members: { some: { userId: user.id } },
          },
        },
      },
      select: {
        id: true,
        title: true,
        project: { select: { workspaceId: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify the subtask exists and belongs to this task
    const existing = await db.subtask.findFirst({
      where: { id: subtaskId, taskId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subtasks not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validation = validateBody(updateSubtaskSchema, body);
    if (validation.error) return validation.error;

    const subtask = await db.subtask.update({
      where: { id: subtaskId },
      data: validation.data,
    });

    // Log d'activité non-bloquant
    if (validation.data.completed !== undefined) {
      logActivity({
        type: "task_updated",
        userId: user.id,
        description: validation.data.completed
          ? `completed a subtask in "${task.title}"`
          : `reopened a subtask in "${task.title}"`,
        workspaceId: task.project.workspaceId,
        targetId: taskId,
        targetType: "task",
      });
    }

    return NextResponse.json(subtask);
  }),
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id: taskId, subtaskId } = await (context as {
      params: Promise<{ id: string; subtaskId: string }>;
    }).params;

    // Verify the task exists and belongs to a workspace the user has access to
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        project: {
          workspace: {
            members: { some: { userId: user.id } },
          },
        },
      },
      select: {
        id: true,
        title: true,
        project: { select: { workspaceId: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify the subtask exists and belongs to this task
    const existing = await db.subtask.findFirst({
      where: { id: subtaskId, taskId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subtasks not found" },
        { status: 404 },
      );
    }

    await db.subtask.delete({ where: { id: subtaskId } });

    // Log d'activité non-bloquant
    logActivity({
      type: "task_updated",
      userId: user.id,
      description: `removed a subtask from "${task.title}"`,
      workspaceId: task.project.workspaceId,
      targetId: taskId,
      targetType: "task",
    });

    return NextResponse.json({ success: true });
  }),
);
