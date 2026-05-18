import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { addTeamMemberSchema } from "@/lib/validations";

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

    const members = await db.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: { neonAuthUserId: true, name: true, email: true, avatar: true, role: true, status: true },
        },
        role: true,
        scopes: {
          include: { scope: true },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    return NextResponse.json(members);
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id: teamId } = await (
      context as { params: Promise<{ id: string }> }
    ).params;

    const body = await request.json();
    const validation = validateBody(addTeamMemberSchema, body);
    if (validation.error) return validation.error;

    const { userId, roleId } = validation.data;

    // Verify team exists in user's workspace
    const team = await db.team.findFirst({
      where: {
        id: teamId,
        workspace: { members: { some: { userId: user.id } } },
      },
    });
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    // Verify the target user belongs to the same workspace
    const targetUserInWorkspace = await db.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: team.workspaceId,
      },
    });
    if (!targetUserInWorkspace)
      return NextResponse.json(
        { error: "User is not a member of this workspace" },
        { status: 400 },
      );

    // Check if already a member
    const existing = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (existing)
      return NextResponse.json(
        { error: "User is already a member of this team" },
        { status: 409 },
      );

    // If roleId provided, verify it belongs to the team
    if (roleId) {
      const role = await db.teamRole.findUnique({
        where: { id: roleId },
      });
      if (!role || role.teamId !== teamId)
        return NextResponse.json(
          { error: "Role not found in this team" },
          { status: 400 },
        );
    }

    const member = await db.teamMember.create({
      data: { teamId, userId, roleId: roleId || null },
      include: {
        user: {
          select: { neonAuthUserId: true, name: true, email: true, avatar: true, role: true, status: true },
        },
        role: true,
        scopes: { include: { scope: true } },
      },
    });

    return NextResponse.json(member, { status: 201 });
  }),
);
