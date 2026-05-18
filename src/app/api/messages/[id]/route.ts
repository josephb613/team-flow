import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler } from "@/lib/api-utils";
import { logActivity } from "@/lib/activity-logger";

export const GET = withErrorHandler(
  withAuth(async (_request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;

    const message = await db.message.findFirst({
      where: {
        id,
        channel: {
          workspace: {
            members: { some: { userId: user.id } },
          },
        },
      },
      include: {
        user: {
          select: { neonAuthUserId: true, name: true, avatar: true },
        },
        channel: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json(message);
  }),
);

export const PATCH = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const body = await request.json();
    const { content } = body;

    // Verify message exists and user has workspace access
    const existing = await db.message.findFirst({
      where: {
        id,
        channel: {
          workspace: {
            members: { some: { userId: user.id } },
          },
        },
      },
      include: {
        channel: { select: { workspaceId: true, name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const message = await db.message.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
      },
      include: {
        user: {
          select: { neonAuthUserId: true, name: true, avatar: true },
        },
        channel: true,
      },
    });

    // Log d'activité non-bloquant
    logActivity({
      type: "comment_added",
      userId: user.id,
      description: `edited a message in #${existing.channel.name}`,
      workspaceId: existing.channel.workspaceId,
      targetId: id,
      targetType: "message",
    });

    return NextResponse.json(message);
  }),
);

export const DELETE = withErrorHandler(
  withAuth(async (request, context, user) => {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;

    // Verify message exists and user has workspace access
    const existing = await db.message.findFirst({
      where: {
        id,
        channel: {
          workspace: {
            members: { some: { userId: user.id } },
          },
        },
      },
      include: {
        channel: { select: { workspaceId: true, name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    await db.message.delete({ where: { id } });

    // Log d'activité non-bloquant
    logActivity({
      type: "comment_added",
      userId: user.id,
      description: `deleted a message in #${existing.channel.name}`,
      workspaceId: existing.channel.workspaceId,
      targetId: id,
      targetType: "message",
    });

    return NextResponse.json({ message: "Message deleted successfully" });
  }),
);
