import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { z } from "zod";

const createColumnSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  color: z.string().optional(),
  icon: z.string().optional(),
  boardType: z.enum(["tasks", "opportunities"]).default("tasks"),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export const GET = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id: workspaceId } = await (context as { params: Promise<{ id: string }> }).params;
    const { searchParams } = new URL(request.url);
    const boardType = searchParams.get("boardType") || undefined;

    // Verify user is a workspace member
    const membership = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const where: Record<string, string> = { workspaceId };
    if (boardType) where.boardType = boardType;

    let columns = await db.boardColumn.findMany({
      where,
      orderBy: { order: "asc" },
    });

    // Auto-backfill: ensure default columns exist for this boardType
    const bt = boardType || "tasks";
    const defaultDefinitions: Array<{
      name: string;
      slug: string;
      color: string;
      icon: string;
      order: number;
      isDefault: boolean;
      boardType: "tasks" | "opportunities";
      workspaceId: string;
    }> =
      bt === "opportunities"
        ? [
            { name: "Nouveau", slug: "nouveau", color: "#6366f1", icon: "lightbulb", order: 0, isDefault: true, boardType: "opportunities" as const, workspaceId },
            { name: "En préparation", slug: "en_preparation", color: "#0ea5e9", icon: "clock", order: 1, isDefault: true, boardType: "opportunities" as const, workspaceId },
            { name: "Soumis", slug: "soumis", color: "#f59e0b", icon: "arrow-right", order: 2, isDefault: true, boardType: "opportunities" as const, workspaceId },
            { name: "Entretien", slug: "entretien", color: "#8b5cf6", icon: "message-circle", order: 3, isDefault: true, boardType: "opportunities" as const, workspaceId },
            { name: "Accepté", slug: "accepte", color: "#10b981", icon: "check-circle-2", order: 4, isDefault: true, boardType: "opportunities" as const, workspaceId },
            { name: "Refusé", slug: "refuse", color: "#ef4444", icon: "flag", order: 5, isDefault: true, boardType: "opportunities" as const, workspaceId },
          ]
        : [
            { name: "À faire", slug: "todo", color: "#64748b", icon: "circle", order: 0, isDefault: true, boardType: "tasks" as const, workspaceId },
            { name: "En cours", slug: "in_progress", color: "#06b6d4", icon: "clock", order: 1, isDefault: true, boardType: "tasks" as const, workspaceId },
            { name: "En revue", slug: "review", color: "#f59e0b", icon: "alert-circle", order: 2, isDefault: true, boardType: "tasks" as const, workspaceId },
            { name: "Terminé", slug: "done", color: "#10b981", icon: "check-circle-2", order: 3, isDefault: true, boardType: "tasks" as const, workspaceId },
          ];

    const existingSlugs = new Set(columns.map((c) => c.slug));
    const missingDefaults = defaultDefinitions.filter(
      (d) => !existingSlugs.has(d.slug),
    );

    if (missingDefaults.length > 0) {
      await db.boardColumn.createMany({ data: missingDefaults });
      columns = await db.boardColumn.findMany({
        where,
        orderBy: { order: "asc" },
      });
    }

    return NextResponse.json(columns);
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id: workspaceId } = await (context as { params: Promise<{ id: string }> }).params;

    // Only admins can create columns
    const membership = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can manage columns" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validation = validateBody(createColumnSchema, body);
    if (validation.error) return validation.error;

    const { name, color, icon, boardType } = validation.data;
    let slug = slugify(name);

    // Ensure unique slug within workspace + boardType
    const existing = await db.boardColumn.findFirst({
      where: { workspaceId, boardType, slug },
    });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Get max order for this boardType
    const lastColumn = await db.boardColumn.findFirst({
      where: { workspaceId, boardType },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const order = (lastColumn?.order ?? -1) + 1;

    const column = await db.boardColumn.create({
      data: {
        name,
        slug,
        color: color || "#6366f1",
        icon: icon || "circle",
        boardType,
        order,
        isDefault: false,
        workspaceId,
      },
    });

    return NextResponse.json(column, { status: 201 });
  }),
);
