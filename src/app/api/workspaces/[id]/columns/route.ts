import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { z } from "zod";

const createColumnSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  color: z.string().optional(),
  icon: z.string().optional(),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export const GET = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id: workspaceId } = await (context as { params: Promise<{ id: string }> }).params;

    // Verify user is a workspace member
    const membership = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    let columns = await db.boardColumn.findMany({
      where: { workspaceId },
      orderBy: { order: "asc" },
    });

    // Auto-backfill: if workspace has no columns yet, create defaults
    if (columns.length === 0) {
      await db.boardColumn.createMany({
        data: [
          { name: "À faire", slug: "todo", color: "#64748b", icon: "circle", order: 0, isDefault: true, workspaceId },
          { name: "En cours", slug: "in_progress", color: "#06b6d4", icon: "clock", order: 1, isDefault: true, workspaceId },
          { name: "En revue", slug: "review", color: "#f59e0b", icon: "alert-circle", order: 2, isDefault: true, workspaceId },
          { name: "Terminé", slug: "done", color: "#10b981", icon: "check-circle-2", order: 3, isDefault: true, workspaceId },
        ],
      });
      columns = await db.boardColumn.findMany({
        where: { workspaceId },
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

    const { name, color, icon } = validation.data;
    let slug = slugify(name);

    // Ensure unique slug within workspace
    const existing = await db.boardColumn.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
    });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Get max order
    const lastColumn = await db.boardColumn.findFirst({
      where: { workspaceId },
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
        order,
        isDefault: false,
        workspaceId,
      },
    });

    return NextResponse.json(column, { status: 201 });
  }),
);
