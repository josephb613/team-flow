// ============================================================
// Trello Manual Sync — POST /api/workspaces/[id]/trello/sync
// Triggers a full push or pull sync on demand.
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler } from "@/lib/api-utils";
import * as Sync from "@/lib/trello-sync";

export const POST = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id: workspaceId } = await (context as { params: Promise<{ id: string }> }).params;

    const membership = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const integration = await db.trelloIntegration.findUnique({
      where: { workspaceId },
    }) as unknown as Sync.TrelloIntegration | null;
    if (!integration || !integration.enabled) {
      return NextResponse.json(
        { error: "Trello integration not configured or disabled" },
        { status: 400 },
      );
    }

    // Read direction from body (default "push")
    const body = await request.json().catch(() => ({}));
    const direction: "push" | "pull" | "both" = body.direction || "both";

    const results: { push?: { created: number; errors: number }; pull?: { synced: number; errors: number } } = {};

    if (direction === "push" || direction === "both") {
      results.push = await Sync.fullPushSync(integration, workspaceId);
    }

    if (direction === "pull" || direction === "both") {
      results.pull = await Sync.fullPullSync(integration);
    }

    return NextResponse.json({
      message: "Sync completed",
      results,
    });
  }),
);
