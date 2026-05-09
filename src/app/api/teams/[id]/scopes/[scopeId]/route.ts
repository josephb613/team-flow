import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { updateScopeSchema } from "@/lib/validations";

export const PATCH = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id: teamId, scopeId } = await (
      context as { params: Promise<{ id: string; scopeId: string }> }
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

    const existing = await db.scope.findFirst({
      where: { id: scopeId, teamId },
    });
    if (!existing)
      return NextResponse.json({ error: "Scope not found" }, { status: 404 });

    const body = await request.json();
    const validation = validateBody(updateScopeSchema, body);
    if (validation.error) return validation.error;

    const scope = await db.scope.update({
      where: { id: scopeId },
      data: validation.data,
    });

    return NextResponse.json(scope);
  }),
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id: teamId, scopeId } = await (
      context as { params: Promise<{ id: string; scopeId: string }> }
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

    const existing = await db.scope.findFirst({
      where: { id: scopeId, teamId },
    });
    if (!existing)
      return NextResponse.json({ error: "Scope not found" }, { status: 404 });

    // Delete related member scopes first
    await db.memberScope.deleteMany({ where: { scopeId } });
    await db.scope.delete({ where: { id: scopeId } });

    return NextResponse.json({ message: "Scope deleted" });
  }),
);
