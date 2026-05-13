import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { z } from "zod";

const updateColumnSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().int().min(0).optional(),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export const PATCH = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id: workspaceId, columnId } = await (context as { params: Promise<{ id: string; columnId: string }> }).params;

    // Admin only
    const membership = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can manage columns" },
        { status: 403 },
      );
    }

    const column = await db.boardColumn.findFirst({
      where: { id: columnId, workspaceId },
    });
    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateBody(updateColumnSchema, body);
    if (validation.error) return validation.error;

    const { name, color, icon, order } = validation.data;
    const updateData: Record<string, unknown> = {};

    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (order !== undefined) updateData.order = order;

    // Rename: update slug and all items referencing this column
    if (name !== undefined && name !== column.name) {
      const newSlug = slugify(name);
      // Check slug not taken by another column (same workspace + boardType)
      const conflict = await db.boardColumn.findFirst({
        where: { workspaceId, boardType: column.boardType, slug: newSlug },
      });
      const finalSlug = conflict && conflict.id !== columnId
        ? `${newSlug}-${Date.now().toString(36)}`
        : newSlug;

      updateData.name = name;
      updateData.slug = finalSlug;

      // Update all items referencing the old slug based on boardType
      if (column.boardType === "tasks") {
        await db.task.updateMany({
          where: { status: column.slug, project: { workspaceId } },
          data: { status: finalSlug },
        });
      } else {
        await db.opportunity.updateMany({
          where: { status: column.slug, workspaceId },
          data: { status: finalSlug },
        });
      }
    }

    const updated = await db.boardColumn.update({
      where: { id: columnId },
      data: updateData,
    });

    return NextResponse.json(updated);
  }),
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id: workspaceId, columnId } = await (context as { params: Promise<{ id: string; columnId: string }> }).params;

    // Admin only
    const membership = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can manage columns" },
        { status: 403 },
      );
    }

    const column = await db.boardColumn.findFirst({
      where: { id: columnId, workspaceId },
    });
    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    if (column.isDefault) {
      return NextResponse.json(
        { error: "Default columns cannot be deleted" },
        { status: 400 },
      );
    }

    // Check if items exist in this column based on boardType
    if (column.boardType === "tasks") {
      const taskCount = await db.task.count({
        where: { status: column.slug, project: { workspaceId } },
      });
      if (taskCount > 0) {
        return NextResponse.json(
          { error: `Cannot delete: ${taskCount} task(s) use this column` },
          { status: 400 },
        );
      }
    } else {
      const oppCount = await db.opportunity.count({
        where: { status: column.slug, workspaceId },
      });
      if (oppCount > 0) {
        return NextResponse.json(
          { error: `Cannot delete: ${oppCount} opportunity(ies) use this column` },
          { status: 400 },
        );
      }
    }

    await db.boardColumn.delete({ where: { id: columnId } });

    return NextResponse.json({ message: "Column deleted" });
  }),
);
