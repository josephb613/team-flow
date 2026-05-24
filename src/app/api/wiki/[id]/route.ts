import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { updateWikiPageSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";

export const GET = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> })
      .params;

    const page = await db.wikiPage.findFirst({
      where: {
        id,
        workspace: { members: { some: { userId: user.id } } },
      },
      include: {
        editor: { select: { neonAuthUserId: true, name: true, avatar: true } },
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: "Wiki page not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(page, {
      headers: {
        "Cache-Control":
          "max-age=300, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  }),
);

export const PUT = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> })
      .params;
    const body = await request.json();

    const validation = validateBody(updateWikiPageSchema, body);
    if (validation.error) return validation.error;

    // Verify workspace membership & page existence
    const existing = await db.wikiPage.findFirst({
      where: {
        id,
        workspace: { members: { some: { userId: user.id } } },
      },
      select: { title: true, workspaceId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Wiki page not found or access denied" },
        { status: 404 },
      );
    }

    const { workspaceId, ...rawData } = validation.data;

    // Clean undefined values so Prisma treats them as "no change"
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    const page = await db.wikiPage.update({
      where: { id },
      data: {
        ...updateData,
        lastEditedBy: user.id,
      },
      include: {
        editor: { select: { neonAuthUserId: true, name: true, avatar: true } },
      },
    });

    logActivity({
      type: "wiki_updated",
      userId: user.id,
      description: `updated wiki page "${page.title}"`,
      workspaceId: existing.workspaceId,
      targetId: page.id,
      targetType: "wiki",
    });

    return NextResponse.json(page);
  }),
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> })
      .params;

    const existing = await db.wikiPage.findFirst({
      where: {
        id,
        workspace: { members: { some: { userId: user.id } } },
      },
      select: { id: true, title: true, workspaceId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Wiki page not found or access denied" },
        { status: 404 },
      );
    }

    // Recursively collect all child page ids
    const idsToDelete = await collectChildIds(id);

    // Delete all child pages first, then the page itself
    if (idsToDelete.length > 0) {
      await db.wikiPage.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }

    await db.wikiPage.delete({ where: { id } });

    logActivity({
      type: "wiki_deleted",
      userId: user.id,
      description: `deleted wiki page "${existing.title}"`,
      workspaceId: existing.workspaceId,
      targetId: id,
      targetType: "wiki",
    });

    return NextResponse.json({ message: "Wiki page deleted successfully" });
  }),
);

/**
 * Recursively collects all descendant page ids for a given parent page.
 */
async function collectChildIds(parentId: string): Promise<string[]> {
  const children = await db.wikiPage.findMany({
    where: { parentId },
    select: { id: true },
  });

  const ids: string[] = [];

  for (const child of children) {
    ids.push(child.id);
    const grandChildIds = await collectChildIds(child.id);
    ids.push(...grandChildIds);
  }

  return ids;
}
