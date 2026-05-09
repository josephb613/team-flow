import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { updateWorkspaceSchema } from "@/lib/validations";

export const GET = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;

    const workspace = await db.workspace.findFirst({
      where: {
        id,
        members: { some: { userId: user.id } },
      },
      include: {
        members: {
          include: { user: true },
        },
        projects: true,
        channels: true,
        teams: true,
        automations: true,
        columns: { orderBy: { order: "asc" } },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(workspace);
  }),
);

export const PATCH = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const body = await request.json();

    const validation = validateBody(updateWorkspaceSchema, body);
    if (validation.error) return validation.error;

    // Only admins can update workspace settings
    const membership = await db.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId: id },
      },
    });
    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can update settings" },
        { status: 403 },
      );
    }

    const workspace = await db.workspace.update({
      where: { id },
      data: validation.data,
      include: {
        members: {
          include: { user: true },
        },
        projects: true,
      },
    });

    return NextResponse.json(workspace);
  }),
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;

    const membership = await db.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId: id },
      },
    });
    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can delete a workspace" },
        { status: 403 },
      );
    }

    await db.workspace.delete({ where: { id } });
    return NextResponse.json({ message: "Workspace deleted successfully" });
  }),
);
