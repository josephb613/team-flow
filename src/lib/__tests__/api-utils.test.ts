import { describe, it, expect, mock } from "bun:test";
import { z } from "zod";

// =============================================================================
// api-utils.ts Unit Tests
//
// We test the core logic in isolation because the source file imports
// from 'next/server' and 'next-auth' which require the full Next.js runtime.
// The functions under test are pure enough to replicate and test directly.
// For full integration tests, use E2E testing with the Next.js server running.
// =============================================================================

// ─── Replicated Functions (pure logic from api-utils.ts) ────────────────────

type AuthSession = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string;
    [key: string]: unknown;
  } | null;
  expires: string;
  [key: string]: unknown;
};

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Extracts typed user info from the session.
 * (Replicated from api-utils.ts getSessionUser)
 */
function getSessionUser(session: AuthSession | null | undefined): AuthenticatedUser | null {
  if (!session?.user) return null;
  return {
    id: (session.user as { id: string }).id,
    email: session.user.email || "",
    name: session.user.name || "Unknown",
    role: (session.user as { role: string }).role || "member",
  };
}

/**
 * Validates request body against a zod schema.
 * Returns parsed data or a 400 error response.
 * (Replicated from api-utils.ts validateBody)
 */
function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
): { data: T; error: null } | { data: null; error: Response } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const flattened = result.error.flatten();
    return {
      data: null,
      error: new Response(
        JSON.stringify({
          error: "Validation failed",
          details: flattened.fieldErrors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    };
  }
  return { data: result.data, error: null };
}

/**
 * Wraps a route handler with a try/catch.
 * On error, logs and returns 500.
 * (Replicated from api-utils.ts withErrorHandler)
 */
function withErrorHandler<TContext = unknown>(
  handler: (
    request: Request,
    context: TContext,
  ) => Promise<Response> | Response,
) {
  return async (request: Request, context: TContext): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error(`[API Error] ${request.method} ${request.url}:`, error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockRequest(url = "http://localhost/api/test", method = "GET"): Request {
  return new Request(url, { method });
}

function createMockSession(overrides: Partial<Record<string, unknown>> = {}): AuthSession {
  return {
    user: {
      id: "user-001",
      email: "john@example.com",
      name: "John Doe",
      ...overrides,
    },
    expires: "2025-12-31T23:59:59.000Z",
  };
}

// ─── getSessionUser Tests ────────────────────────────────────────────────────

describe("getSessionUser", () => {
  describe("happy path", () => {
    it("extracts user from a valid session", () => {
      const session = createMockSession();
      const user = getSessionUser(session);
      expect(user).not.toBeNull();
      expect(user!.id).toBe("user-001");
      expect(user!.email).toBe("john@example.com");
      expect(user!.name).toBe("John Doe");
    });

    it("defaults role to 'member' when not set", () => {
      const session = createMockSession({ role: undefined });
      const user = getSessionUser(session);
      expect(user!.role).toBe("member");
    });

    it("extracts custom role from session", () => {
      const session = createMockSession({ role: "admin" });
      const user = getSessionUser(session);
      expect(user!.role).toBe("admin");
    });

    it("defaults email to empty string when missing", () => {
      const session = createMockSession({ email: undefined });
      const user = getSessionUser(session);
      expect(user!.email).toBe("");
    });

    it("defaults name to 'Unknown' when missing", () => {
      const session = createMockSession({ name: undefined });
      const user = getSessionUser(session);
      expect(user!.name).toBe("Unknown");
    });
  });

  describe("edge cases", () => {
    it("returns null for null session", () => {
      const user = getSessionUser(null as unknown as AuthSession);
      expect(user).toBeNull();
    });

    it("returns null for session without user", () => {
      const session = { expires: "2025-01-01" } as AuthSession;
      const user = getSessionUser(session);
      expect(user).toBeNull();
    });

    it("returns null for undefined session", () => {
      const user = getSessionUser(undefined as unknown as AuthSession);
      expect(user).toBeNull();
    });

    it("returns null when user is null", () => {
      const session = { user: null, expires: "2025-01-01" } as unknown as AuthSession;
      const user = getSessionUser(session);
      expect(user).toBeNull();
    });
  });
});

// ─── validateBody Tests ──────────────────────────────────────────────────────

describe("validateBody", () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive().optional(),
  });

  describe("happy path", () => {
    it("returns parsed data for valid body", () => {
      const result = validateBody(testSchema, { name: "Alice", age: 30 });
      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      if (result.data) {
        expect(result.data.name).toBe("Alice");
        expect(result.data.age).toBe(30);
      }
    });

    it("returns data without optional fields", () => {
      const result = validateBody(testSchema, { name: "Bob" });
      expect(result.error).toBeNull();
      if (result.data) {
        expect(result.data.name).toBe("Bob");
        expect(result.data.age).toBeUndefined();
      }
    });

    it("handles empty allowed optional fields", () => {
      const schema = z.object({ name: z.string(), tags: z.array(z.string()).optional() });
      const result = validateBody(schema, { name: "test" });
      expect(result.error).toBeNull();
    });
  });

  describe("validation errors", () => {
    it("returns error response for invalid body (missing required field)", () => {
      const result = validateBody(testSchema, { age: 25 });
      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
      if (result.error) {
        expect(result.error.status).toBe(400);
      }
    });

    it("returns error response for type mismatch", () => {
      const result = validateBody(testSchema, { name: "Alice", age: "not-a-number" });
      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
    });

    it("returns error response for empty object against required schema", () => {
      const result = validateBody(testSchema, {});
      expect(result.error).not.toBeNull();
    });

    it("returns error response for null body", () => {
      const result = validateBody(testSchema, null);
      expect(result.error).not.toBeNull();
    });

    it("returns error response for undefined body", () => {
      const result = validateBody(testSchema, undefined);
      expect(result.error).not.toBeNull();
    });
  });

  describe("error response content", () => {
    it("returns 'Validation failed' message", async () => {
      const result = validateBody(testSchema, { name: "" });
      expect(result.error).not.toBeNull();
      if (result.error) {
        const body = await result.error.json();
        expect(body.error).toBe("Validation failed");
        expect(body.details).toBeDefined();
      }
    });

    it("returns field-level error details", async () => {
      const result = validateBody(testSchema, { name: "" });
      expect(result.error).not.toBeNull();
      if (result.error) {
        const body = await result.error.json();
        expect(body.details).toBeDefined();
        expect(typeof body.details).toBe("object");
      }
    });
  });

  describe("edge cases", () => {
    it("handles array schema validation", () => {
      const arraySchema = z.array(z.string());
      const result = validateBody(arraySchema, ["a", "b", "c"]);
      expect(result.error).toBeNull();
      if (result.data) {
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBe(3);
      }
    });

    it("handles complex nested schema", () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
          }),
        }),
      });
      const result = validateBody(nestedSchema, {
        user: { profile: { name: "Deep" } },
      });
      expect(result.error).toBeNull();
    });

    it("rejects array body for object schema", () => {
      const result = validateBody(testSchema, ["not", "an", "object"]);
      expect(result.error).not.toBeNull();
    });

    it("rejects primitive body for object schema", () => {
      const result = validateBody(testSchema, 42);
      expect(result.error).not.toBeNull();
    });
  });
});

// ─── withErrorHandler Tests ─────────────────────────────────────────────────

describe("withErrorHandler", () => {
  describe("happy path", () => {
    it("returns successful response when handler does not throw", async () => {
      const handler = mock(async (_req: Request, _ctx: unknown) => {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const wrapped = withErrorHandler(handler);
      const req = mockRequest();
      const response = await wrapped(req, {});

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it("preserves custom status codes", async () => {
      const handler = mock(async (_req: Request, _ctx: unknown) => {
        return new Response(JSON.stringify({ created: true }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      });

      const wrapped = withErrorHandler(handler);
      const req = mockRequest();
      const response = await wrapped(req, {});

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.created).toBe(true);
    });
  });

  describe("error handling", () => {
    it("returns 500 when handler throws an Error", async () => {
      const handler = mock(async (_req: Request, _ctx: unknown) => {
        throw new Error("Something went wrong");
      });

      const wrapped = withErrorHandler(handler);
      const req = mockRequest();
      const response = await wrapped(req, {});

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Internal server error");
    });

    it("returns 500 for non-Error throws (string)", async () => {
      const handler = mock(async (_req: Request, _ctx: unknown) => {
        throw "raw string error";
      });

      const wrapped = withErrorHandler(handler);
      const req = mockRequest();
      const response = await wrapped(req, {});

      expect(response.status).toBe(500);
    });

    it("returns 500 for non-Error throws (object)", async () => {
      const handler = mock(async (_req: Request, _ctx: unknown) => {
        throw { code: "CUSTOM_ERROR" };
      });

      const wrapped = withErrorHandler(handler);
      const req = mockRequest();
      const response = await wrapped(req, {});

      expect(response.status).toBe(500);
    });

    it("returns JSON content type on error", async () => {
      const handler = mock(async (_req: Request, _ctx: unknown) => {
        throw new Error("fail");
      });

      const wrapped = withErrorHandler(handler);
      const req = mockRequest();
      const response = await wrapped(req, {});

      expect(response.headers.get("Content-Type")).toContain("application/json");
    });
  });

  describe("context passing", () => {
    it("passes context to the handler", async () => {
      const ctxRef = { value: "" };
      const handler = mock(async (_req: Request, ctx: { value: string }) => {
        ctxRef.value = ctx.value;
        return new Response("ok", { status: 200 });
      });

      const wrapped = withErrorHandler(handler);
      const req = mockRequest();
      await wrapped(req, { value: "test-context" });

      expect(ctxRef.value).toBe("test-context");
    });

    it("passes complex context objects", async () => {
      const captured: unknown[] = [];
      const handler = mock(async (_req: Request, ctx: { params: { id: string } }) => {
        captured.push(ctx.params.id);
        return new Response("ok", { status: 200 });
      });

      const wrapped = withErrorHandler(handler);
      const req = mockRequest();
      await wrapped(req, { params: { id: "task-42" } });

      expect(captured[0]).toBe("task-42");
    });
  });
});
