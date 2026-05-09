import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createTeamRoleSchema } from "@/lib/validations";

export const GET = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id: teamId } = await (
      context as { params: Promise<{ id: string }> }
    ).params;

    // Verify team exists in user's workspace
    const team = await db.team.findFirst({
      where: {
        id: teamId,
        workspace: { members: { some: { userId: user.id } } },
      },
    });
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const roles = await db.teamRole.findMany({
      where: { teamId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(roles);
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id: teamId } = await (
      context as { params: Promise<{ id: string }> }
    ).params;

    const body = await request.json();
    const validation = validateBody(createTeamRoleSchema, body);
    if (validation.error) return validation.error;

    const { name, description, color, icon } = validation.data;

    // Verify team exists in user's workspace
    const team = await db.team.findFirst({
      where: {
        id: teamId,
        workspace: { members: { some: { userId: user.id } } },
      },
    });
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    // Check uniqueness
    const existing = await db.teamRole.findUnique({
      where: { teamId_name: { teamId, name } },
    });
    if (existing)
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 409 },
      );

    const role = await db.teamRole.create({
      data: {
        teamId,
        name,
        description: description || null,
        color: color || "#6366f1",
        icon: icon || "👤",
      },
    });

    return NextResponse.json(role, { status: 201 });
  }),
);
