// ============================================================
// Create Trello Board — POST /api/workspaces/[id]/trello/create-board
// Creates a new Trello board with default TeamFlow lists.
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import * as Trello from "@/lib/trello-client";
import { z } from "zod";

const createBoardSchema = z.object({
  name: z.string().min(1, "Board name is required"),
  description: z.string().optional(),
  createDefaultLists: z.boolean().optional().default(true),
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

    // Get stored Trello credentials
    const integration = await db.trelloIntegration.findUnique({
      where: { workspaceId },
    });

    // If no integration exists, check for credentials in body
    const body = await request.json();
    const validation = validateBody(createBoardSchema, body);
    if (validation.error) return validation.error;

    const { name, description, createDefaultLists } = validation.data;

    let apiKey = body.apiKey || integration?.trelloApiKey;
    let token = body.token || integration?.trelloToken;

    if (!apiKey || !token) {
      return NextResponse.json(
        { error: "Trello API credentials required" },
        { status: 400 }
      );
    }

    const auth = { apiKey, token };

    try {
      // Create the board without default Trello lists (we'll create our own)
      const board = await Trello.createBoard(auth, {
        name,
        desc: description,
        defaultLists: false,
        prefs_permissionLevel: "private",
      });

      // Create TeamFlow default lists if requested
      let lists: Trello.TrelloList[] = [];
      if (createDefaultLists) {
        const defaultLists = [
          { name: "To Do", pos: 1 },
          { name: "In Progress", pos: 2 },
          { name: "Review", pos: 3 },
          { name: "Done", pos: 4 },
        ];

        for (const listDef of defaultLists) {
          const list = await Trello.createList(auth, {
            name: listDef.name,
            idBoard: board.id,
            pos: listDef.pos,
          });
          lists.push(list);
        }
      }

      // Create default list mapping
      const listMapping: Record<string, string> = {};
      if (lists.length >= 4) {
        listMapping.todo = lists[0].id;
        listMapping.in_progress = lists[1].id;
        listMapping.review = lists[2].id;
        listMapping.done = lists[3].id;
      }

      return NextResponse.json({
        board,
        lists,
        listMapping,
      });
    } catch (error) {
      console.error("Failed to create Trello board:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to create board: ${message}` },
        { status: 500 }
      );
    }
  })
);
