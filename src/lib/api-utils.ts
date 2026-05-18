import { getAuthSession } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

// ---- Auth helpers ----

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
  return async (request: Request, context: TContext): Promise<NextResponse> => {
    const user = await getAuthSession();
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

// ---- Task helpers ----

/**
 * Normalizes a task's `tags` field from a comma-separated string (as stored
 * in the database) to a string array, matching the frontend `Task` type.
 * Returns a new object; does not mutate the original.
 */
export function normalizeTaskTags<T extends { tags: unknown }>(
  task: T,
): T & { tags: string[] } {
  const raw = task.tags;
  let tags: string[] = [];
  if (Array.isArray(raw)) {
    tags = raw.filter((t): t is string => typeof t === "string");
  } else if (typeof raw === "string" && raw.length > 0) {
    tags = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return { ...task, tags };
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
  return async (request: Request, context: TContext): Promise<NextResponse> => {
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
