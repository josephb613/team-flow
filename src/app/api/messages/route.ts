import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createMessageSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";

export const GET = withErrorHandler(
  withAuth(async (_request, _context, user) => {
    const messages = await db.message.findMany({
      where: {
        channel: {
          workspace: {
            members: { some: { userId: user.id } },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        channel: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(messages);
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const body = await request.json();

    const validation = validateBody(createMessageSchema, body);
    if (validation.error) return validation.error;

    const { content, channelId } = validation.data;

    // Verify channel membership
    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
      select: { workspaceId: true, name: true },
    });
    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found or access denied" },
        { status: 404 },
      );
    }

    const message = await db.message.create({
      data: {
        content,
        channelId,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Log d'activité non-bloquant
    logActivity({
      type: "comment_added",
      userId: user.id,
      description: `sent a message in #${channel.name}`,
      workspaceId: channel.workspaceId,
      targetId: message.id,
      targetType: "message",
    });

    return NextResponse.json(message, { status: 201 });
  }),
);
