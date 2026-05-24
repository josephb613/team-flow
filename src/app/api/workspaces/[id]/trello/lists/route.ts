// ============================================================
// Trello Lists — GET /api/workspaces/[id]/trello/lists?boardId=xxx
// Lists open lists on a given Trello board for mapping setup.
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

    // Check workspace access
    const membership = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get credentials from stored integration or query params
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

    const lists = await Trello.getListsOnBoard({ apiKey, token }, boardId);
    return NextResponse.json(lists);
  }),
);
