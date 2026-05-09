import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { updateTeamSchema } from "@/lib/validations";

export const PATCH = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id } = await ((context as { params: Promise<{ id: string }> }).params);
    const body = await request.json();

    const validation = validateBody(updateTeamSchema, body);
    if (validation.error) return validation.error;

    const existing = await db.team.findFirst({
      where: {
        id,
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 },
      );
    }

    const team = await db.team.update({
      where: { id },
      data: validation.data,
      include: {
        teamMembers: { include: { user: true } },
      },
    });

    return NextResponse.json(team);
  }),
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id } = await ((context as { params: Promise<{ id: string }> }).params);

    const existing = await db.team.findFirst({
      where: {
        id,
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 },
      );
    }

    // Delete related TeamMember records first
    await db.teamMember.deleteMany({ where: { teamId: id } });
    await db.team.delete({ where: { id } });

    return NextResponse.json({ message: "Team deleted successfully" });
  }),
);
