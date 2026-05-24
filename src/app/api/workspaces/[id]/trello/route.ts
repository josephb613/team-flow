// ============================================================
// Trello Integration CRUD — GET / PUT / DELETE
// Workspace-scoped: /api/workspaces/[id]/trello
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { z } from "zod";

const trelloConfigSchema = z.object({
  trelloApiKey: z.string().min(1, "API Key is required"),
  trelloToken: z.string().min(1, "Token is required"),
  boardId: z.string().min(1, "Board ID is required"),
  boardName: z.string().optional(),
  listMapping: z.record(z.string(), z.string()).optional(),
  memberMapping: z.record(z.string(), z.string()).optional(),
  enabled: z.boolean().optional(),
  syncDirection: z.enum(["bidirectional", "to_trello", "to_app"]).optional(),
});

// GET — retrieve the Trello integration config for the workspace
export const GET = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id: workspaceId } = await (
      context as { params: Promise<{ id: string }> }
    ).params;

    // Verify workspace membership
    const membership = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const integration = await db.trelloIntegration.findUnique({
      where: { workspaceId },
      include: {
        syncLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!integration) {
      return NextResponse.json({ configured: false });
    }

    // Don't return full credentials to the client — mask them
    return NextResponse.json({
      ...integration,
      trelloApiKey: integration.trelloApiKey.slice(0, 8) + "...",
      trelloToken: integration.trelloToken.slice(0, 4) + "...",
    });
  }),
);

// POST (upsert) — create or update the Trello integration
export const POST = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id: workspaceId } = await (
      context as { params: Promise<{ id: string }> }
    ).params;

    // Admin only for configuration
    const membership = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validation = validateBody(trelloConfigSchema, body);
    if (validation.error) return validation.error;

    const { listMapping, memberMapping, ...rest } = validation.data;

    let apiKey = rest.trelloApiKey;
    let token = rest.trelloToken;
    if (!apiKey || apiKey.includes('...')) {
      const ex = await db.trelloIntegration.findUnique({ where: { workspaceId } });
      if (ex) { apiKey = ex.trelloApiKey; token = ex.trelloToken; }
    }

    const integration = await db.trelloIntegration.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        ...rest,
        trelloApiKey: apiKey,
        trelloToken: token,
        listMapping: listMapping || {},
        memberMapping: memberMapping || {},
      },
      update: {
        ...rest,
        trelloApiKey: apiKey,
        trelloToken: token,
        listMapping: listMapping || undefined,
        memberMapping: memberMapping || undefined,
      },
    });
    return NextResponse.json(integration, { status: 201 });
  }),
);

// DELETE — remove the Trello integration
export const DELETE = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id: workspaceId } = await (
      context as { params: Promise<{ id: string }> }
    ).params;

    const membership = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const existing = await db.trelloIntegration.findUnique({
      where: { workspaceId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "No integration configured" },
        { status: 404 },
      );
    }

    await db.trelloIntegration.delete({ where: { workspaceId } });

    return NextResponse.json({ message: "Integration removed" });
  }),
);
