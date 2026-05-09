import { describe, it, expect } from "bun:test";
import {
  createTaskSchema,
  updateTaskSchema,
  createProjectSchema,
  updateProjectSchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
  createMessageSchema,
  createUserSchema,
  inviteMemberSchema,
  updateInvitationSchema,
} from "../validations";

// ─── Factories ───────────────────────────────────────────────────────────────

const validTask = {
  title: "Implement login page",
  description: "Build the login page with form validation",
  status: "todo" as const,
  priority: "high" as const,
  tags: ["frontend", "auth"],
  dueDate: "2025-12-31T23:59:59.000Z",
  projectId: "proj-001",
  assigneeId: "user-001",
  creatorId: "user-002",
};

const validProject = {
  name: "Website Redesign",
  description: "Complete overhaul of the company website",
  color: "#FF5733",
  icon: "globe",
  workspaceId: "ws-001",
};

const validWorkspace = {
  name: "Engineering Team",
  slug: "engineering-team",
  description: "Engineering department workspace",
  color: "#3366FF",
  icon: "code",
};

const validMessage = {
  content: "Hello team!",
  channelId: "ch-001",
  userId: "user-001",
};

const validUser = {
  email: "john@example.com",
  name: "John Doe",
  role: "admin" as const,
};

// ─── createTaskSchema ────────────────────────────────────────────────────────

describe("createTaskSchema", () => {
  describe("happy path", () => {
    it("accepts a fully valid task", () => {
      const result = createTaskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it("accepts a minimal task (only required fields)", () => {
      const result = createTaskSchema.safeParse({
        title: "Minimal Task",
        projectId: "proj-001",
      });
      expect(result.success).toBe(true);
    });

    it("accepts null description", () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        description: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts null dueDate", () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        dueDate: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts all valid statuses", () => {
      for (const status of ["todo", "in_progress", "review", "done"] as const) {
        const result = createTaskSchema.safeParse({ ...validTask, status });
        expect(result.success).toBe(true);
      }
    });

    it("accepts all valid priorities", () => {
      for (const priority of ["low", "medium", "high", "urgent"] as const) {
        const result = createTaskSchema.safeParse({ ...validTask, priority });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("validation errors", () => {
    it("rejects empty title", () => {
      const result = createTaskSchema.safeParse({ ...validTask, title: "" });
      expect(result.success).toBe(false);
    });

    it("rejects title exceeding 200 characters", () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        title: "x".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("rejects description exceeding 5000 characters", () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        description: "x".repeat(5001),
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing projectId", () => {
      const { projectId, ...rest } = validTask;
      const result = createTaskSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects invalid status", () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        status: "invalid_status",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid priority", () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        priority: "critical",
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-array tags", () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        tags: "not-an-array",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid dueDate format", () => {
      const result = createTaskSchema.safeParse({
        ...validTask,
        dueDate: "not-a-date",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("optional fields", () => {
    it("omits status when not provided", () => {
      const { status, ...rest } = validTask;
      const result = createTaskSchema.safeParse(rest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBeUndefined();
      }
    });

    it("omits tags when not provided", () => {
      const { tags, ...rest } = validTask;
      const result = createTaskSchema.safeParse(rest);
      expect(result.success).toBe(true);
    });
  });
});

// ─── updateTaskSchema ────────────────────────────────────────────────────────

describe("updateTaskSchema", () => {
  describe("happy path", () => {
    it("accepts a partial update with all fields", () => {
      const result = updateTaskSchema.safeParse({
        title: "Updated title",
        status: "in_progress",
      });
      expect(result.success).toBe(true);
    });

    it("accepts an empty object (all fields optional)", () => {
      const result = updateTaskSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts only status update", () => {
      const result = updateTaskSchema.safeParse({ status: "done" });
      expect(result.success).toBe(true);
    });
  });

  describe("validation errors", () => {
    it("rejects invalid status in partial update", () => {
      const result = updateTaskSchema.safeParse({ status: "unknown" });
      expect(result.success).toBe(false);
    });

    it("rejects title exceeding max length", () => {
      const result = updateTaskSchema.safeParse({ title: "x".repeat(201) });
      expect(result.success).toBe(false);
    });
  });
});

// ─── createProjectSchema ─────────────────────────────────────────────────────

describe("createProjectSchema", () => {
  describe("happy path", () => {
    it("accepts a fully valid project", () => {
      const result = createProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it("accepts a minimal project", () => {
      const result = createProjectSchema.safeParse({
        name: "My Project",
        workspaceId: "ws-001",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("validation errors", () => {
    it("rejects empty name", () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects name exceeding 100 characters", () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        name: "x".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing workspaceId", () => {
      const { workspaceId, ...rest } = validProject;
      const result = createProjectSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects description exceeding 2000 characters", () => {
      const result = createProjectSchema.safeParse({
        ...validProject,
        description: "x".repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });
});

// ─── updateProjectSchema ─────────────────────────────────────────────────────

describe("updateProjectSchema", () => {
  describe("happy path", () => {
    it("accepts partial updates", () => {
      const result = updateProjectSchema.safeParse({ name: "New Name" });
      expect(result.success).toBe(true);
    });

    it("accepts valid status transitions", () => {
      for (const status of ["active", "on_hold", "completed", "archived"] as const) {
        const result = updateProjectSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("validation errors", () => {
    it("rejects invalid status", () => {
      const result = updateProjectSchema.safeParse({ status: "deleted" });
      expect(result.success).toBe(false);
    });
  });
});

// ─── createWorkspaceSchema ───────────────────────────────────────────────────

describe("createWorkspaceSchema", () => {
  describe("happy path", () => {
    it("accepts a valid workspace", () => {
      const result = createWorkspaceSchema.safeParse(validWorkspace);
      expect(result.success).toBe(true);
    });

    it("accepts slug with single word", () => {
      const result = createWorkspaceSchema.safeParse({
        name: "Engineering",
        slug: "engineering",
      });
      expect(result.success).toBe(true);
    });

    it("accepts slug with hyphens", () => {
      const result = createWorkspaceSchema.safeParse({
        name: "Engineering Team",
        slug: "engineering-team",
      });
      expect(result.success).toBe(true);
    });

    it("accepts slug with numbers", () => {
      const result = createWorkspaceSchema.safeParse({
        name: "Team 42",
        slug: "team-42",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("slug validation", () => {
    it("rejects slug with uppercase characters", () => {
      const result = createWorkspaceSchema.safeParse({
        name: "Team",
        slug: "Engineering-Team",
      });
      expect(result.success).toBe(false);
    });

    it("rejects slug with spaces", () => {
      const result = createWorkspaceSchema.safeParse({
        name: "Team",
        slug: "engineering team",
      });
      expect(result.success).toBe(false);
    });

    it("rejects slug with special characters", () => {
      const result = createWorkspaceSchema.safeParse({
        name: "Team",
        slug: "engineering@team",
      });
      expect(result.success).toBe(false);
    });

    it("rejects slug with underscores", () => {
      const result = createWorkspaceSchema.safeParse({
        name: "Team",
        slug: "engineering_team",
      });
      expect(result.success).toBe(false);
    });

    it("rejects slug starting with hyphen", () => {
      const result = createWorkspaceSchema.safeParse({
        name: "Team",
        slug: "-engineering",
      });
      expect(result.success).toBe(false);
    });

    it("rejects slug ending with hyphen", () => {
      const result = createWorkspaceSchema.safeParse({
        name: "Team",
        slug: "engineering-",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty slug", () => {
      const result = createWorkspaceSchema.safeParse({
        name: "Team",
        slug: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects slug exceeding 50 characters", () => {
      const result = createWorkspaceSchema.safeParse({
        name: "Team",
        slug: "a".repeat(51),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("validation errors", () => {
    it("rejects empty name", () => {
      const result = createWorkspaceSchema.safeParse({
        ...validWorkspace,
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects name exceeding 100 characters", () => {
      const result = createWorkspaceSchema.safeParse({
        ...validWorkspace,
        name: "x".repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });
});

// ─── updateWorkspaceSchema ───────────────────────────────────────────────────

describe("updateWorkspaceSchema", () => {
  it("accepts partial update with all fields optional", () => {
    const result = updateWorkspaceSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid slug update", () => {
    const result = updateWorkspaceSchema.safeParse({ slug: "new-slug" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid slug format in update", () => {
    const result = updateWorkspaceSchema.safeParse({ slug: "INVALID" });
    expect(result.success).toBe(false);
  });
});

// ─── createMessageSchema ─────────────────────────────────────────────────────

describe("createMessageSchema", () => {
  describe("happy path", () => {
    it("accepts a valid message", () => {
      const result = createMessageSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
    });
  });

  describe("validation errors", () => {
    it("rejects empty content", () => {
      const result = createMessageSchema.safeParse({
        ...validMessage,
        content: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects content exceeding 5000 characters", () => {
      const result = createMessageSchema.safeParse({
        ...validMessage,
        content: "x".repeat(5001),
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing channelId", () => {
      const { channelId, ...rest } = validMessage;
      const result = createMessageSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects missing userId", () => {
      const { userId, ...rest } = validMessage;
      const result = createMessageSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });
});

// ─── createUserSchema ────────────────────────────────────────────────────────

describe("createUserSchema", () => {
  describe("happy path", () => {
    it("accepts a valid user", () => {
      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it("accepts user with default role", () => {
      const { role, ...rest } = validUser;
      const result = createUserSchema.safeParse(rest);
      expect(result.success).toBe(true);
    });

    it("accepts all valid roles", () => {
      for (const role of ["admin", "member", "guest"] as const) {
        const result = createUserSchema.safeParse({ ...validUser, role });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("validation errors", () => {
    it("rejects invalid email", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty email", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        email: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects name exceeding 100 characters", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        name: "x".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid role", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        role: "superadmin",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("accepts email with subdomains", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        email: "john@mail.engineering.example.com",
      });
      expect(result.success).toBe(true);
    });

    it("accepts email with plus symbol", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        email: "john+tag@example.com",
      });
      expect(result.success).toBe(true);
    });
  });
});

// ─── Invitation Schema Tests ─────────────────────────────────────────────────

const validInvite = {
  email: "newmember@example.com",
  role: "member" as const,
};

describe("inviteMemberSchema", () => {
  it("accepts valid invite with default role", () => {
    const result = inviteMemberSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("member");
    }
  });

  it("accepts valid invite with admin role", () => {
    const result = inviteMemberSchema.safeParse({
      ...validInvite,
      role: "admin",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid invite with guest role", () => {
    const result = inviteMemberSchema.safeParse({
      ...validInvite,
      role: "guest",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = inviteMemberSchema.safeParse({
      ...validInvite,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = inviteMemberSchema.safeParse({
      ...validInvite,
      email: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = inviteMemberSchema.safeParse({
      ...validInvite,
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });

  it("accepts email with subdomains", () => {
    const result = inviteMemberSchema.safeParse({
      ...validInvite,
      email: "user@sub.example.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateInvitationSchema", () => {
  it("accepts accepted status", () => {
    const result = updateInvitationSchema.safeParse({ status: "accepted" });
    expect(result.success).toBe(true);
  });

  it("accepts declined status", () => {
    const result = updateInvitationSchema.safeParse({ status: "declined" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = updateInvitationSchema.safeParse({ status: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = updateInvitationSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
