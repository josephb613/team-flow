import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createFileSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";

export const GET = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    const whereClause: any = {
      workspace: { members: { some: { userId: user.id } } },
    };

    if (workspaceId) {
      const membership = await db.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId,
          },
        },
      });
      if (!membership) {
        return NextResponse.json(
          { error: "Workspace not found or access denied" },
          { status: 403 },
        );
      }
      whereClause.workspaceId = workspaceId;
    }

    const files = await db.fileItem.findMany({
      where: whereClause,
      include: {
        uploader: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(files);
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const body = await request.json();
    const validation = validateBody(createFileSchema, body);
    if (validation.error) return validation.error;

    const { name, type, size, url, projectId, workspaceId } = validation.data;

    // Verify workspace membership
    const membership = await db.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId },
      },
    });
    if (!membership)
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 403 },
      );

    const file = await db.fileItem.create({
      data: {
        name,
        type: type || "other",
        size: size || 0,
        url,
        projectId: projectId || null,
        workspaceId,
        uploadedBy: user.id,
      },
      include: {
        uploader: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Log d'activité non-bloquant
    logActivity({
      type: "file_uploaded",
      userId: user.id,
      description: `uploaded "${name}"`,
      workspaceId,
      targetId: file.id,
      targetType: "file",
    });

    return NextResponse.json(file, { status: 201 });
  }),
);
