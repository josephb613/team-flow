import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { updateTeamRoleSchema } from "@/lib/validations";

export const PATCH = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id: teamId, roleId } = await (
      context as { params: Promise<{ id: string; roleId: string }> }
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

    const existing = await db.teamRole.findFirst({
      where: { id: roleId, teamId },
    });
    if (!existing)
      return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const body = await request.json();
    const validation = validateBody(updateTeamRoleSchema, body);
    if (validation.error) return validation.error;

    const role = await db.teamRole.update({
      where: { id: roleId },
      data: validation.data,
    });

    return NextResponse.json(role);
  }),
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id: teamId, roleId } = await (
      context as { params: Promise<{ id: string; roleId: string }> }
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

    const existing = await db.teamRole.findFirst({
      where: { id: roleId, teamId },
    });
    if (!existing)
      return NextResponse.json({ error: "Role not found" }, { status: 404 });

    // Set all members with this role to null
    await db.teamMember.updateMany({
      where: { roleId },
      data: { roleId: null },
    });

    await db.teamRole.delete({ where: { id: roleId } });

    return NextResponse.json({ message: "Role deleted" });
  }),
);
