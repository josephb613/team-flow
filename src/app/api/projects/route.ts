import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createProjectSchema } from "@/lib/validations";
import { transformProject } from "@/lib/project-transform";
import { logActivity } from "@/lib/activity-logger";

export const GET = withErrorHandler(
  withAuth(async (_request, _context, user) => {
    const projects = await db.project.findMany({
      where: {
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
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects.map(transformProject));
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const body = await request.json();

    const validation = validateBody(createProjectSchema, body);
    if (validation.error) return validation.error;

    const { name, description, color, icon, dueDate, workspaceId } = validation.data;

    // Verify workspace membership
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
        { status: 404 },
      );
    }

    const project = await db.project.create({
      data: {
        name,
        description: description || null,
        color: color || "#10b981",
        icon: icon || "📋",
        dueDate: dueDate ? new Date(dueDate) : null,
        workspaceId,
      },
    });

    // Log d'activité non-bloquant
    logActivity({
      type: "project_created",
      userId: user.id,
      description: `created project "${name}"`,
      workspaceId,
      targetId: project.id,
      targetType: "project",
    });

    return NextResponse.json(project, { status: 201 });
  }),
);
