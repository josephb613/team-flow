import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { updateInvitationSchema } from "@/lib/validations";

export const PATCH = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id, invitationId } = await (context as { params: Promise<{ id: string; invitationId: string }> }).params;

    // Only admins can manage invitations
    const membership = await db.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId: id },
      },
    });
    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can manage invitations" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validation = validateBody(updateInvitationSchema, body);
    if (validation.error) return validation.error;

    const { status } = validation.data;

    const invitation = await db.invitation.findFirst({
      where: { id: invitationId, workspaceId: id },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Can only update a pending invitation" },
        { status: 400 },
      );
    }

    const updated = await db.invitation.update({
      where: { id: invitationId },
      data: { status },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updated);
  }),
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id, invitationId } = await (context as { params: Promise<{ id: string; invitationId: string }> }).params;

    // Only admins can delete invitations
    const membership = await db.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId: id },
      },
    });
    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can delete invitations" },
        { status: 403 },
      );
    }

    const invitation = await db.invitation.findFirst({
      where: { id: invitationId, workspaceId: id },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }

    await db.invitation.delete({ where: { id: invitationId } });
    return NextResponse.json({
      message: "Invitation deleted successfully",
    });
  }),
);
