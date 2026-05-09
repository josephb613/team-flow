import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { updateProjectSchema } from "@/lib/validations";
import { transformProject } from "@/lib/project-transform";
import { logActivity } from "@/lib/activity-logger";

export const GET = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id } = await ((context as { params: Promise<{ id: string }> }).params);
    const project = await db.project.findFirst({
      where: {
        id,
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
      include: {
        workspace: {
          include: {
            members: true,
          },
        },
        tasks: {
          include: {
            assignee: true,
            subtasks: true,
          },
        },
        meetings: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(transformProject(project));
  }),
);

export const PATCH = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id } = await ((context as { params: Promise<{ id: string }> }).params);
    const body = await request.json();

    const validation = validateBody(updateProjectSchema, body);
    if (validation.error) return validation.error;

    const existing = await db.project.findFirst({
      where: {
        id,
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
      select: { name: true, workspaceId: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    // Convertir dueDate string -> Date si présent
    const patchData: Record<string, unknown> = { ...validation.data };
    if (patchData.dueDate !== undefined) {
      patchData.dueDate = patchData.dueDate ? new Date(patchData.dueDate as string) : null;
    }

    const project = await db.project.update({
      where: { id },
      data: patchData,
      include: {
        workspace: {
          include: {
            members: true,
          },
        },
        tasks: {
          include: {
            assignee: true,
            subtasks: true,
          },
        },
        meetings: true,
      },
    });

    // Log d'activité non-bloquant
    logActivity({
      type: "project_updated",
      userId: user.id,
      description: `updated project "${existing.name}"`,
      workspaceId: existing.workspaceId,
      targetId: id,
      targetType: "project",
    });

    return NextResponse.json(transformProject(project));
  }),
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id } = await ((context as { params: Promise<{ id: string }> }).params);

    const existing = await db.project.findFirst({
      where: {
        id,
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
      select: { name: true, workspaceId: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    await db.project.delete({ where: { id } });

    // Log d'activité non-bloquant
    logActivity({
      type: "project_deleted",
      userId: user.id,
      description: `deleted project "${existing.name}"`,
      workspaceId: existing.workspaceId,
      targetId: id,
      targetType: "project",
    });

    return NextResponse.json({ message: "Project deleted successfully" });
  }),
);
