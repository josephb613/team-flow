import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler } from "@/lib/api-utils";

export const GET = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");
    const workspaceId = searchParams.get("workspaceId");

    const where: Record<string, unknown> = {
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
      where.workspaceId = workspaceId;
    }

    // Si un targetId est fourni, on filtre directement par cet ID
    if (targetId) {
      where.targetId = targetId;
    }

    // Si un projectId est fourni, on filtre les logs liés à ce projet
    // via les tâches du projet ou via targetId = projectId
    if (projectId) {
      where.OR = [
        { targetId: projectId, targetType: "project" },
        {
          targetType: "task",
          targetId: {
            in: (
              await db.task.findMany({
                where: { projectId },
                select: { id: true },
              })
            ).map((t) => t.id),
          },
        },
      ];
    }

    if (targetType) {
      where.targetType = targetType;
    }

    const logs = await db.activityLog.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Map createdAt → timestamp pour correspondre au type ActivityItem du frontend
    const mapped = logs.map((log) => ({
      ...log,
      timestamp: log.createdAt,
    }));

    return NextResponse.json(mapped);
  }),
);
