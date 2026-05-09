import { z } from "zod";

// ---- Task schemas ----

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  status: z.string().min(1).max(50).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string().min(1, "Project is required"),
  assigneeId: z.string().optional().nullable(),
  creatorId: z.string().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.string().min(1).max(50).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
});

// ---- Project schemas ----

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().optional(),
  icon: z.string().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  workspaceId: z.string().min(1, "Workspace is required"),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().optional(),
  icon: z.string().optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  workspaceId: z.string().optional(),
});

// ---- Workspace schemas ----

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens",
    ),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens",
    )
    .optional(),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

// ---- Message schemas ----

export const createMessageSchema = z.object({
  content: z.string().min(1, "Content is required").max(5000),
  channelId: z.string().min(1, "Channel is required"),
  userId: z.string().min(1, "User is required"),
});

// ---- Channel schemas ----

export const createChannelSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum(["team", "project", "direct"]),
  workspaceId: z.string().min(1, "Workspace is required"),
});

// ---- User schemas ----

export const createUserSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(1, "Name is required").max(100),
  role: z.enum(["admin", "member", "guest"]).optional(),
});

// ---- Meeting schemas ----

export const createMeetingSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  date: z.string().datetime("Invalid date"),
  duration: z.number().int().min(1).max(480).optional(),
  status: z
    .enum(["scheduled", "in_progress", "completed", "cancelled"])
    .optional(),
  link: z.string().url().optional().nullable(),
  projectId: z.string().optional().nullable(),
});

export const updateMeetingSchema = createMeetingSchema.partial();

// ---- Team schemas ----

export const createTeamSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().optional(),
  workspaceId: z.string().min(1, "Workspace is required"),
});

export const updateTeamSchema = createTeamSchema.partial();

// ---- Automation schemas ----

export const createAutomationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  trigger: z.string().min(1),
  action: z.string().min(1),
  enabled: z.boolean().optional(),
  workspaceId: z.string().min(1, "Workspace is required"),
});

export const updateAutomationSchema = createAutomationSchema.partial();

// ---- Wiki schemas ----

export const createWikiPageSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().optional().nullable(),
  workspaceId: z.string().min(1, "Workspace is required"),
});

export const updateWikiPageSchema = createWikiPageSchema.partial();

// ---- File schemas ----

export const createFileSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: z
    .enum(["document", "spreadsheet", "presentation", "image", "pdf", "other"])
    .optional(),
  size: z.number().int().min(0).optional(),
  url: z.string().min(1, "URL is required"),
  projectId: z.string().optional().nullable(),
  workspaceId: z.string().min(1, "Workspace is required"),
});

export const updateFileSchema = createFileSchema.partial();

// ---- Invitation schemas ----

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "member", "guest"]).optional().default("member"),
});

export const updateInvitationSchema = z.object({
  status: z.enum(["accepted", "declined"]),
});

// ---- Opportunity schemas ----

export const createOpportunitySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  organisation: z.string().max(200).optional().nullable(),
  status: z.enum([
    "nouveau",
    "en_preparation",
    "soumis",
    "entretien",
    "accepte",
    "refuse",
  ]).optional().default("nouveau"),
  dueDate: z.string().datetime().optional().nullable(),
  responsableId: z.string().optional().nullable(),
  workspaceId: z.string().min(1, "Workspace is required"),
  creatorId: z.string().optional().nullable(),
});

export const updateOpportunitySchema = createOpportunitySchema.partial();

// ---- Team Role schemas ----

export const createTeamRoleSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  description: z.string().max(500).optional().nullable(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const updateTeamRoleSchema = createTeamRoleSchema.partial();

// ---- Scope schemas ----

export const createScopeSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  description: z.string().max(500).optional().nullable(),
  type: z.enum(["functional", "permission"]).optional().default("functional"),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const updateScopeSchema = createScopeSchema.partial();

// ---- Team Member management schemas ----

// ---- Comment schemas ----

export const createCommentSchema = z.object({
  content: z.string().min(1, "Content is required").max(2000),
});

// ---- Team Member management schemas ----

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1, "User is required"),
  roleId: z.string().optional().nullable(),
});

export const updateTeamMemberSchema = z.object({
  roleId: z.string().optional().nullable(),
  scopes: z
    .array(
      z.object({
        scopeId: z.string(),
        permission: z.enum(["read", "write", "admin"]),
      })
    )
    .optional(),
});
