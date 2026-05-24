import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createTeamSchema } from "@/lib/validations";

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

    const teams = await db.team.findMany({
      where: whereClause,
      include: {
        teamMembers: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(teams, {
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
    const validation = validateBody(createTeamSchema, body);
    if (validation.error) return validation.error;

    const { name, description, color, workspaceId } = validation.data;

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

    const team = await db.team.create({
      data: {
        name,
        description: description || null,
        color: color || "#10b981",
        workspaceId,
      },
      include: {
        teamMembers: { include: { user: true } },
      },
    });

    return NextResponse.json(team, { status: 201 });
  }),
);
