import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

// ---- Auth helpers ----

export type AuthSession = NonNullable<Awaited<ReturnType<typeof getServerSession>>>;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface RouteContext {
  params: Promise<Record<string, string>>;
}

/**
 * Returns the current server session or null.
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  return getServerSession(authOptions);
}

/**
 * Extracts typed user info from the session.
 */
export function getSessionUser(
  session: Record<string, unknown> | null,
): AuthenticatedUser | null {
  const user = session?.user as Record<string, unknown> | null | undefined;
  if (!user) return null;
  return {
    id: (user.id as string) || "",
    email: (user.email as string) || "",
    name: (user.name as string) || "Unknown",
    role: (user.role as string) || "member",
  };
}

/**
 * Wraps a route handler, requiring a valid session.
 * If unauthenticated, returns 401.
 */
export function withAuth<TContext extends RouteContext = RouteContext>(
  handler: (
    request: Request,
    context: TContext,
    user: AuthenticatedUser,
  ) => Promise<NextResponse> | NextResponse,
) {
  return async (
    request: Request,
    context: TContext,
  ): Promise<NextResponse> => {
    const session = await getAuthSession();
    const user = getSessionUser(session);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(request, context, user);
  };
}

/**
 * Wraps a route handler, requiring an admin role.
 */
export function withAdminAuth<TContext extends RouteContext = RouteContext>(
  handler: (
    request: Request,
    context: TContext,
    user: AuthenticatedUser,
  ) => Promise<NextResponse> | NextResponse,
) {
  return withAuth<TContext>(async (request, context, user) => {
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(request, context, user);
  });
}

// ---- Validation helpers ----

export interface ValidationError {
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
}

/**
 * Validates request body against a zod schema.
 * Returns parsed data or a 400 error response.
 */
export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown,
): { data: T; error: null } | { data: null; error: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const flattened = result.error.flatten();
    return {
      data: null,
      error: NextResponse.json(
        {
          error: "Validation failed",
          details: flattened.fieldErrors,
        },
        { status: 400 },
      ),
    };
  }
  return { data: result.data, error: null };
}

// ---- Error helpers ----

/**
 * Wraps a route handler with a try/catch.
 * On error, logs and returns 500.
 */
export function withErrorHandler<TContext = unknown>(
  handler: (
    request: Request,
    context: TContext,
  ) => Promise<NextResponse> | NextResponse,
) {
  return async (
    request: Request,
    context: TContext,
  ): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error(`[API Error] ${request.method} ${request.url}:`, error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
