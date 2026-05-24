import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { updatePhaseSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";

export const GET = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> })
      .params;

    const phase = await db.projectPhase.findFirst({
      where: {
        id,
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
      include: {
        responsable: true,
        project: true,
      },
    });

    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    return NextResponse.json(phase);
  }),
);

export const PATCH = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> })
      .params;
    const body = await request.json();

    const validation = validateBody(updatePhaseSchema, body);
    if (validation.error) return validation.error;

    // Verify ownership
    const existing = await db.projectPhase.findFirst({
      where: {
        id,
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
      select: {
        name: true,
        status: true,
        workspaceId: true,
        projectId: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    const { startDate, endDate, ...rest } = validation.data;

    const phase = await db.projectPhase.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined && {
          startDate: startDate ? new Date(startDate) : null,
        }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
      },
      include: {
        responsable: true,
        project: true,
      },
    });

    const newStatus = validation.data.status;
    let activityType = "phase_updated";
    let description = `updated phase "${phase.name}"`;

    if (newStatus && newStatus !== existing.status) {
      if (newStatus === "completed") {
        activityType = "phase_completed";
        description = `completed phase "${phase.name}"`;
      } else if (newStatus === "active") {
        activityType = "phase_started";
        description = `started phase "${phase.name}"`;
      }
    }

    logActivity({
      type: activityType,
      userId: user.id,
      description,
      workspaceId: existing.workspaceId,
      targetId: phase.id,
      targetType: "phase",
    });

    return NextResponse.json(phase);
  }),
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> })
      .params;

    const existing = await db.projectPhase.findFirst({
      where: {
        id,
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
      select: {
        name: true,
        workspaceId: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    await db.projectPhase.delete({ where: { id } });

    logActivity({
      type: "phase_deleted",
      userId: user.id,
      description: `deleted phase "${existing.name}"`,
      workspaceId: existing.workspaceId,
      targetId: id,
      targetType: "phase",
    });

    return NextResponse.json({ success: true });
  }),
);
