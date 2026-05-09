import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { inviteMemberSchema } from "@/lib/validations";

export const GET = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;

    // Only admins can view invitations
    const membership = await db.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId: id },
      },
    });
    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can view invitations" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const whereClause: Record<string, unknown> = { workspaceId: id };
    if (status && ["pending", "accepted", "declined"].includes(status)) {
      whereClause.status = status;
    }

    const invitations = await db.invitation.findMany({
      where: whereClause as { workspaceId: string; status?: string },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invitations);
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const body = await request.json();

    const validation = validateBody(inviteMemberSchema, body);
    if (validation.error) return validation.error;

    const { email, role } = validation.data;

    // Only admins can invite new members
    const membership = await db.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId: id },
      },
    });
    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can invite members" },
        { status: 403 },
      );
    }

    // Check if the workspace exists
    const workspace = await db.workspace.findUnique({ where: { id } });
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    // Find user by email
    const existingUser = await db.user.findUnique({ where: { email } });

    if (existingUser) {
      // User exists — check if already a member
      const existingMember = await db.workspaceMember.findUnique({
        where: {
          userId_workspaceId: { userId: existingUser.id, workspaceId: id },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "Cet utilisateur est déjà membre de cet espace de travail" },
          { status: 409 },
        );
      }

      // Add directly as workspace member
      const member = await db.workspaceMember.create({
        data: {
          userId: existingUser.id,
          workspaceId: id,
          role,
        },
        include: {
          user: true,
        },
      });

      return NextResponse.json(
        { type: "member", data: member },
        { status: 201 },
      );
    }

    // User doesn't exist — create an invitation
    // Check for existing pending invitation for this email
    const existingInvitation = await db.invitation.findUnique({
      where: {
        email_workspaceId: { email, workspaceId: id },
      },
    });

    if (existingInvitation && existingInvitation.status === "pending") {
      return NextResponse.json(
        { error: "Une invitation est déjà en attente pour cet email" },
        { status: 409 },
      );
    }

    const invitation = await db.invitation.create({
      data: {
        email,
        workspaceId: id,
        invitedById: user.id,
        role,
      },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(
      { type: "invitation", data: invitation },
      { status: 201 },
    );
  }),
);
