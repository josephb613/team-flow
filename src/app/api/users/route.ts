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

    const users = await db.userProfile.findMany({
      where: whereClause,
      select: {
        neonAuthUserId: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    // Map neonAuthUserId back to id for frontend compatibility
    const mapped = users.map((u) => ({
      id: u.neonAuthUserId,
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
    }));

    return NextResponse.json(mapped);
  }),
);

export const POST = withErrorHandler(
  withAuth(async (request, _context) => {
    const body = await request.json();

    const validation = validateBody(createUserSchema, body);
    if (validation.error) return validation.error;

    const { email, name, role } = validation.data;

    // Check for existing user
    const existing = await db.userProfile.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    // Note: user creation via this endpoint is deprecated — use Neon Auth signUp instead.
    // This endpoint remains for admin-created users (requires a neonAuthUserId to be provided).
    const { neonAuthUserId } = body;
    if (!neonAuthUserId) {
      return NextResponse.json(
        { error: "neonAuthUserId is required for user creation" },
        { status: 400 },
      );
    }

    const userProfile = await db.userProfile.create({
      data: {
        neonAuthUserId,
        email,
        name,
        role: role || "member",
      },
      select: {
        neonAuthUserId: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { id: userProfile.neonAuthUserId, ...userProfile },
      { status: 201 },
    );
  }),
);
