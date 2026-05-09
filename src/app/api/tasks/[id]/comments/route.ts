import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createCommentSchema } from "@/lib/validations";
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
    const validation = validateBody(createCommentSchema, body);
    if (validation.error) return validation.error;

    const comment = await db.comment.create({
      data: {
        content: validation.data.content,
        taskId: id,
        userId: user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Log d'activité non-bloquant
    logActivity({
      type: "comment_added",
      userId: user.id,
      description: `commented on "${task.title}"`,
      workspaceId: task.project.workspaceId,
      targetId: id,
      targetType: "task",
    });

    return NextResponse.json(comment);
  }),
);
