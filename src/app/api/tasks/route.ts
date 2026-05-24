import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  withAuth,
  withErrorHandler,
  validateBody,
  normalizeTaskTags,
} from "@/lib/api-utils";
import { createTaskSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";
import { updatePhaseProgress } from "@/lib/phase-utils";
import * as TrelloSync from "@/lib/trello-sync";

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
        phase: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tasks.map(normalizeTaskTags), {
      headers: {
        "Cache-Control":
          "max-age=300, s-maxage=600, stale-while-revalidate=86400",
      },
    });
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
      phaseId,
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
        phaseId: phaseId || null,
        assigneeId: assigneeId || null,
        creatorId: user.id,
        ...(subtaskInput &&
          subtaskInput.length > 0 && {
            subtasks: {
              create: subtaskInput,
            },
          }),
      },
      include: {
        assignee: true,
        subtasks: true,
        project: true,
        phase: true,
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

    // Recalculer la progression de la phase si la tâche est liée à une phase
    if (task.phaseId) {
      updatePhaseProgress(task.phaseId).catch((err) =>
        console.error("[PhaseProgress] Failed to update phase progress:", err),
      );
    }

    // Trello sync — fire and forget
    (async () => {
      try {
        const integration = await TrelloSync.requireIntegration(
          project.workspaceId,
        );
        if (integration && integration.syncDirection !== "to_app") {
          await TrelloSync.pushTaskToTrello(task, integration);
        }
      } catch (err) {
        console.error("[Trello] Auto-sync create failed:", err);
      }
    })();

    return NextResponse.json(normalizeTaskTags(task), { status: 201 });
  }),
);
