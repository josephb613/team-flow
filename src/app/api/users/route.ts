import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withErrorHandler, validateBody } from "@/lib/api-utils";
import { createUserSchema } from "@/lib/validations";

export const GET = withErrorHandler(
  withAuth(async (request, _context, user) => {
    // Only return users that share a workspace with the current user
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    // Build where clause: if workspaceId provided, filter by it;
    // otherwise, return users from all workspaces the current user belongs to
    const whereClause = workspaceId
      ? { workspaceMembers: { some: { workspaceId } } }
      : {
          workspaceMembers: {
            some: {
              workspace: {
                members: { some: { userId: user.id } },
              },
            },
          },
        };

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, _context) => {
    const body = await request.json();

    const validation = validateBody(createUserSchema, body);
    if (validation.error) return validation.error;

    const { email, name, role } = validation.data;

    // Check for existing user
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const user = await db.user.create({
      data: { email, name, role: role || "member" },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  }),
);
