import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createPhaseSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";

export const GET = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const projectId = searchParams.get("projectId");

    const whereClause: any = {
      workspace: {
        members: { some: { userId: user.id } },
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
      whereClause.workspaceId = workspaceId;
    }

    if (projectId) {
      whereClause.projectId = projectId;
    }

    const phases = await db.projectPhase.findMany({
      where: whereClause,
      include: {
        responsable: true,
        project: true,
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(phases, {
      headers: {
        "Cache-Control":
          "max-age=60, s-maxage=120, stale-while-revalidate=300",
      },
    });
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const body = await request.json();

    const validation = validateBody(createPhaseSchema, body);
    if (validation.error) return validation.error;

    const {
      name,
      order,
      status,
      startDate,
      endDate,
      projectId,
      responsableId,
      workspaceId,
    } = validation.data;

    // Verify the workspace belongs to the user
    const workspace = await db.workspace.findFirst({
      where: {
        id: workspaceId,
        members: { some: { userId: user.id } },
      },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 404 },
      );
    }

    // Verify the project exists in the workspace
    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true, name: true },
    });
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    const phase = await db.projectPhase.create({
      data: {
        name,
        order: order ?? 0,
        status: status ?? "pending",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        projectId,
        responsableId: responsableId || null,
        workspaceId,
      },
      include: {
        responsable: true,
        project: true,
      },
    });

    logActivity({
      type: "phase_created",
      userId: user.id,
      description: `created phase "${name}" for project "${project.name}"`,
      workspaceId,
      targetId: phase.id,
      targetType: "phase",
    });

    return NextResponse.json(phase, { status: 201 });
  }),
);
