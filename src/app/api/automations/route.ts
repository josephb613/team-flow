import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createAutomationSchema } from "@/lib/validations";

export const GET = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    const whereClause: any = {
      workspace: { members: { some: { userId: user.id } } },
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

    const automations = await db.automation.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(automations);
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const body = await request.json();
    const validation = validateBody(createAutomationSchema, body);
    if (validation.error) return validation.error;

    const { name, trigger, action, enabled, workspaceId } = validation.data;

    // Verify workspace membership
    const membership = await db.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId },
      },
    });
    if (!membership)
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 403 },
      );

    const automation = await db.automation.create({
      data: {
        name,
        trigger,
        action,
        enabled: enabled ?? true,
        workspaceId,
      },
    });

    return NextResponse.json(automation, { status: 201 });
  }),
);
