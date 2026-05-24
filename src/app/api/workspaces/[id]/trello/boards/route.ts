// ============================================================
// Trello Boards — GET /api/workspaces/[id]/trello/boards
// Lists accessible Trello boards for the integration setup.
// Uses credentials provided in the query or stored integration.
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler } from "@/lib/api-utils";
import * as Trello from "@/lib/trello-client";

export const GET = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id: workspaceId } = await (context as { params: Promise<{ id: string }> }).params;
    const { searchParams } = new URL(request.url);

    // Check workspace access
    const membership = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Support either stored creds or query params for initial setup
    let apiKey = searchParams.get("key");
    let token = searchParams.get("token");

    if (!apiKey || !token) {
      // Try stored integration
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
        { error: "Trello API key and token required (as query params or stored config)" },
        { status: 400 },
      );
    }

    const boards = await Trello.getBoards({ apiKey, token });
    return NextResponse.json(boards);
  }),
);
