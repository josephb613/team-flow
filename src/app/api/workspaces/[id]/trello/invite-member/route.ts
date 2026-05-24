// ============================================================
// Invite Member to Trello Board — POST /api/workspaces/[id]/trello/invite-member
// Invites a workspace member to the connected Trello board.
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import * as Trello from "@/lib/trello-client";
import { z } from "zod";

const inviteMemberSchema = z.object({
  email: z.string().email("Valid email required"),
  fullName: z.string().optional(),
  memberType: z.enum(["admin", "normal", "observer"]).optional().default("normal"),
});

export const POST = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id: workspaceId } = await (
      context as { params: Promise<{ id: string }> }
    ).params;

    // Check workspace membership (admin only)
    const membership = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get stored Trello integration
    const integration = await db.trelloIntegration.findUnique({
      where: { workspaceId },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Trello integration not configured" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = validateBody(inviteMemberSchema, body);
    if (validation.error) return validation.error;

    const { email, fullName, memberType } = validation.data;
    const auth = {
      apiKey: integration.trelloApiKey,
      token: integration.trelloToken,
    };

    try {
      const member = await Trello.inviteMemberToBoard(
        auth,
        integration.boardId,
        email,
        fullName
      );

      return NextResponse.json({
        success: true,
        member,
        message: `Invitation sent to ${email}`,
      });
    } catch (error) {
      console.error("Failed to invite member to Trello:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      
      if (message.includes("already a member")) {
        return NextResponse.json(
          { error: "This person is already a member of the board" },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to invite member: ${message}` },
        { status: 500 }
      );
    }
  })
);
