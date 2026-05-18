import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { updateTeamMemberSchema } from "@/lib/validations";

export const PATCH = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id: teamId, memberId } = await (
      context as { params: Promise<{ id: string; memberId: string }> }
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

    // Verify the member belongs to the team
    const member = await db.teamMember.findFirst({
      where: { id: memberId, teamId },
    });
    if (!member)
      return NextResponse.json(
        { error: "Member not found in this team" },
        { status: 404 },
      );

    const body = await request.json();
    const validation = validateBody(updateTeamMemberSchema, body);
    if (validation.error) return validation.error;

    const { roleId, scopes } = validation.data;

    // Update role if provided
    if (roleId !== undefined) {
      if (roleId !== null) {
        const role = await db.teamRole.findUnique({ where: { id: roleId } });
        if (!role || role.teamId !== teamId)
          return NextResponse.json(
            { error: "Role not found in this team" },
            { status: 400 },
          );
      }
      await db.teamMember.update({
        where: { id: memberId },
        data: { roleId },
      });
    }

    // Update scopes if provided
    if (scopes !== undefined) {
      // Delete existing scopes
      await db.memberScope.deleteMany({ where: { memberId } });
      // Create new scopes
      if (scopes.length > 0) {
        await db.memberScope.createMany({
          data: scopes.map((s: { scopeId: string; permission: string }) => ({
            memberId,
            scopeId: s.scopeId,
            permission: s.permission,
          })),
        });
      }
    }

    // Return updated member
    const updated = await db.teamMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: { neonAuthUserId: true, name: true, email: true, avatar: true, role: true, status: true },
        },
        role: true,
        scopes: { include: { scope: true } },
      },
    });

    return NextResponse.json(updated);
  }),
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id: teamId, memberId } = await (
      context as { params: Promise<{ id: string; memberId: string }> }
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

    // Verify the member belongs to the team
    const member = await db.teamMember.findFirst({
      where: { id: memberId, teamId },
    });
    if (!member)
      return NextResponse.json(
        { error: "Member not found in this team" },
        { status: 404 },
      );

    // Delete related member scopes first, then the member
    await db.memberScope.deleteMany({ where: { memberId } });
    await db.teamMember.delete({ where: { id: memberId } });

    return NextResponse.json({ message: "Member removed from team" });
  }),
);
