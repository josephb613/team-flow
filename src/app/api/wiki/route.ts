import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createWikiPageSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";

export const GET = withErrorHandler(
  withAuth(async (_request, _context, user) => {
    const pages = await db.wikiPage.findMany({
      where: {
        workspace: { members: { some: { userId: user.id } } },
      },
      include: {
        editor: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(pages);
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const body = await request.json();
    const validation = validateBody(createWikiPageSchema, body);
    if (validation.error) return validation.error;

    const { title, content, icon, parentId, workspaceId } = validation.data;

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

    const page = await db.wikiPage.create({
      data: {
        title,
        content: content || "",
        icon: icon || "📄",
        parentId: parentId || null,
        workspaceId,
        lastEditedBy: user.id,
      },
      include: {
        editor: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Log d'activité non-bloquant
    logActivity({
      type: "wiki_created",
      userId: user.id,
      description: `created wiki page "${title}"`,
      workspaceId,
      targetId: page.id,
      targetType: "wiki",
    });

    return NextResponse.json(page, { status: 201 });
  }),
);
