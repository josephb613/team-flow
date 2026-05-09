import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { updateOpportunitySchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";

export const GET = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id } = await (
      context as { params: Promise<{ id: string }> }
    ).params;

    const opportunity = await db.opportunity.findFirst({
      where: {
        id,
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
      include: {
        creator: true,
        responsable: true,
      },
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(opportunity);
  }),
);

export const PATCH = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id } = await (
      context as { params: Promise<{ id: string }> }
    ).params;
    const body = await request.json();

    const validation = validateBody(updateOpportunitySchema, body);
    if (validation.error) return validation.error;

    // Verify ownership
    const existing = await db.opportunity.findFirst({
      where: {
        id,
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
      select: {
        title: true,
        status: true,
        workspaceId: true,
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 },
      );
    }

    const { dueDate, ...rest } = validation.data;

    const opportunity = await db.opportunity.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
      },
      include: {
        creator: true,
        responsable: true,
      },
    });

    // Log d'activité non-bloquant
    const newStatus = validation.data.status;
    let activityType = "opportunity_updated";
    let description = `updated opportunity "${opportunity.title}"`;

    if (newStatus && newStatus !== existing.status) {
      if (newStatus === "accepte") {
        activityType = "opportunity_won";
        description = `won opportunity "${opportunity.title}"`;
      } else if (newStatus === "refuse") {
        activityType = "opportunity_lost";
        description = `lost opportunity "${opportunity.title}"`;
      }
    }

    logActivity({
      type: activityType,
      userId: user.id,
      description,
      workspaceId: existing.workspaceId,
      targetId: opportunity.id,
      targetType: "opportunity",
    });

    return NextResponse.json(opportunity);
  }),
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id } = await (
      context as { params: Promise<{ id: string }> }
    ).params;

    const existing = await db.opportunity.findFirst({
      where: {
        id,
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
      select: {
        title: true,
        workspaceId: true,
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 },
      );
    }

    await db.opportunity.delete({ where: { id } });

    // Log d'activité non-bloquant
    logActivity({
      type: "opportunity_deleted",
      userId: user.id,
      description: `deleted opportunity "${existing.title}"`,
      workspaceId: existing.workspaceId,
      targetId: id,
      targetType: "opportunity",
    });

    return NextResponse.json({ success: true });
  }),
);
