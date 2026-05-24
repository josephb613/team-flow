import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createChannelSchema } from "@/lib/validations";

// GET - List channels for the current user's workspaces
export const GET = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    const whereClause: any = {
      workspace: {
        members: { some: { userId: user.id } },
      },
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

    const channels = await db.channel.findMany({
      where: whereClause,
      include: {
        channelMembers: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const result = channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      members: ch.channelMembers.map((m) => m.userId),
      unread: 0,
    }));

    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "max-age=300, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  }),
);

// POST - Create a new channel
export const POST = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const body = await request.json();

    const validation = validateBody(createChannelSchema, body);
    if (validation.error) return validation.error;

    const { name, type, workspaceId } = validation.data;

    // Verify workspace membership
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
        { status: 404 },
      );
    }

    // Create the channel
    const channel = await db.channel.create({
      data: {
        name,
        type,
        workspaceId,
        channelMembers: {
          create: {
            userId: user.id,
          },
        },
      },
      include: {
        channelMembers: true,
      },
    });

    return NextResponse.json(
      {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        members: channel.channelMembers.map((m) => m.userId),
        unread: 0,
      },
      { status: 201 },
    );
  }),
);
