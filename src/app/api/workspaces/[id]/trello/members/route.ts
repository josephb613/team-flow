// ============================================================
// Trello Members — GET /api/workspaces/[id]/trello/members?boardId=xxx
// Lists members of a Trello board (for assignee mapping).
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler } from "@/lib/api-utils";
import * as Trello from "@/lib/trello-client";

export const GET = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id: workspaceId } = await (context as { params: Promise<{ id: string }> }).params;
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");

    if (!boardId) {
      return NextResponse.json(
        { error: "boardId query parameter is required" },
        { status: 400 },
      );
    }

    const membership = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let apiKey = searchParams.get("key");
    let token = searchParams.get("token");

    if (!apiKey || !token) {
      const integration = await db.trelloIntegration.findUnique({
        where: { workspaceId },
      });
      if (integration) {
        apiKey = integration.trelloApiKey;
        token = integration.trelloToken;
      }
    }

    if (!apiKey || !token) {
      return NextResponse.json(
        { error: "Trello API key and token required" },
        { status: 400 },
      );
    }

    const members = await Trello.getBoardMembers({ apiKey, token }, boardId);
    return NextResponse.json(members);
  }),
);
