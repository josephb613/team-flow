import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createSubtaskSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";

export const POST = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;

    // Verify the task exists and belongs to a workspace the user has access to
    const task = await db.task.findFirst({
      where: {
        id,
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

    const body = await request.json();
    const validation = validateBody(createSubtaskSchema, body);
    if (validation.error) return validation.error;

    // Count existing subtasks to limit to 20
    const count = await db.subtask.count({ where: { taskId: id } });
    if (count >= 20) {
      return NextResponse.json(
        { error: "Maximum of 20 subtasks per task" },
        { status: 400 },
      );
    }

    const subtask = await db.subtask.create({
      data: {
        title: validation.data.title,
        completed: false,
        taskId: id,
      },
    });

    // Log d'activité non-bloquant
    logActivity({
      type: "task_updated",
      userId: user.id,
      description: `added a subtask to "${task.title}"`,
      workspaceId: task.project.workspaceId,
      targetId: id,
      targetType: "task",
    });

    return NextResponse.json(subtask);
  }),
);
