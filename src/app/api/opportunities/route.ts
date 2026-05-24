import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createOpportunitySchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";

export const GET = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

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

    const opportunities = await db.opportunity.findMany({
      where: whereClause,
      include: {
        creator: true,
        responsable: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(opportunities, {
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

    const validation = validateBody(createOpportunitySchema, body);
    if (validation.error) return validation.error;

    const {
      title,
      description,
      organisation,
      status,
      dueDate,
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

    const opportunity = await db.opportunity.create({
      data: {
        title,
        description: description || null,
        organisation: organisation || null,
        status: status || "nouveau",
        dueDate: dueDate ? new Date(dueDate) : null,
        responsableId: responsableId || null,
        workspaceId,
        creatorId: user.id,
      },
      include: {
        creator: true,
        responsable: true,
      },
    });

    // Log d'activité non-bloquant
    logActivity({
      type: "opportunity_created",
      userId: user.id,
      description: `created opportunity "${title}"`,
      workspaceId,
      targetId: opportunity.id,
      targetType: "opportunity",
    });

    return NextResponse.json(opportunity, { status: 201 });
  }),
);
