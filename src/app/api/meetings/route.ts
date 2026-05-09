import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createMeetingSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-logger";

export const GET = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const whereClause: Record<string, unknown> = {
      project: {
        workspace: {
          members: { some: { userId: user.id } },
        },
      },
    };
    if (projectId) (whereClause as Record<string, unknown>).projectId = projectId;

    const meetings = await db.meeting.findMany({
      where: whereClause,
      include: {
        meetingMembers: { include: { user: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(meetings);
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const body = await request.json();
    const validation = validateBody(createMeetingSchema, body);
    if (validation.error) return validation.error;

    const { title, description, date, duration, status, link, projectId } =
      validation.data;

    // Verify project belongs to user's workspace
    let meetingWorkspaceId: string | null = null;
    if (projectId) {
      const project = await db.project.findFirst({
        where: {
          id: projectId,
          workspace: { members: { some: { userId: user.id } } },
        },
        select: { workspaceId: true },
      });
      if (!project)
        return NextResponse.json(
          { error: "Project not found or access denied" },
          { status: 403 },
        );
      meetingWorkspaceId = project.workspaceId;
    }

    const meeting = await db.meeting.create({
      data: {
        title,
        description: description || null,
        date: new Date(date),
        duration: duration || 60,
        status: status || "scheduled",
        link: link || null,
        projectId: projectId || null,
      },
      include: {
        meetingMembers: { include: { user: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Log d'activité non-bloquant (seulement si la réunion est liée à un projet)
    if (meetingWorkspaceId) {
      logActivity({
        type: "meeting_created",
        userId: user.id,
        description: `scheduled "${title}"`,
        workspaceId: meetingWorkspaceId,
        targetId: meeting.id,
        targetType: "meeting",
      });
    }

    return NextResponse.json(meeting, { status: 201 });
  }),
);
