import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createWorkspaceSchema } from "@/lib/validations";

export const GET = withErrorHandler(
  withAuth(async (_request, _context, user) => {
    const workspaces = await db.workspace.findMany({
      where: {
        members: {
          some: { userId: user.id },
        },
      },
      include: {
        members: {
          include: { user: true },
        },
        projects: true,
        columns: { orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(workspaces, {
      headers: {
        "Cache-Control":
          "max-age=300, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, _context, user) => {
    const body = await request.json();

    const validation = validateBody(createWorkspaceSchema, body);
    if (validation.error) return validation.error;

    const { name, slug, description, color, icon } = validation.data;

    // Ensure slug uniqueness
    let finalSlug = slug;
    const existing = await db.workspace.findUnique({
      where: { slug: finalSlug },
    });
    if (existing) {
      finalSlug = `${slug}-${Date.now().toString(36)}`;
    }

    console.log("[Workspace Create] Starting workspace creation:", {
      name,
      slug: finalSlug,
      userId: user.id,
    });

    try {
      const workspace = await db.workspace.create({
        data: {
          name,
          slug: finalSlug,
          description: description || null,
          color: color || "#10b981",
          icon: icon || "🏢",
          members: {
            create: {
              userId: user.id,
              role: "admin",
            },
          },
          columns: {
            create: [
              {
                name: "À faire",
                slug: "todo",
                color: "#64748b",
                icon: "circle",
                order: 0,
                isDefault: true,
              },
              {
                name: "En cours",
                slug: "in_progress",
                color: "#06b6d4",
                icon: "clock",
                order: 1,
                isDefault: true,
              },
              {
                name: "En revue",
                slug: "review",
                color: "#f59e0b",
                icon: "alert-circle",
                order: 2,
                isDefault: true,
              },
              {
                name: "Terminé",
                slug: "done",
                color: "#10b981",
                icon: "check-circle-2",
                order: 3,
                isDefault: true,
              },
            ],
          },
        },
        include: {
          members: {
            include: { user: true },
          },
          columns: { orderBy: { order: "asc" } },
        },
      });

      console.log("[Workspace Create] Success:", workspace.id);
      return NextResponse.json(workspace, { status: 201 });
    } catch (prismaError) {
      console.error("[Workspace Create] Prisma error:", prismaError);
      return NextResponse.json(
        {
          error: "Database error during workspace creation",
          details:
            process.env.NODE_ENV === "development"
              ? String(prismaError)
              : undefined,
        },
        { status: 500 },
      );
    }
  }),
);
