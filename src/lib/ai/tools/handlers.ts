import { z } from 'zod';
import { db } from '@/lib/db';
import { triggerReindex } from '@/lib/ai/embeddings/indexer';
import { getEvmSummary } from '@/lib/pmp/evm';
import { getWorkload } from '@/lib/pmp/workload';
import { getCriticalPath } from '@/lib/pmp/critical-path';
import {
  assertProjectInWorkspace,
  assertTaskInWorkspace,
  assertUserInWorkspace,
} from '@/lib/workspace-api';
import { buildProjectScopedWhere } from '@/lib/workspace-query';
import {
  buildRiskWriteData,
  clampRiskRating,
  formatRiskResponse,
  loadRelatedTasksForRisks,
  validateRiskTaskIds,
} from '@/lib/risk-api';
import { storePendingAction } from './pending-actions';
import type { PendingAction, ToolAuthContext, ToolResult, WriteToolName } from './types';

const listTasksSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  projectId: z.string().optional(),
  overdue: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  projectId: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});

const updateTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
});

const updateTaskSchema = z
  .object({
    taskId: z.string().min(1),
    status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    dueDate: z.string().nullable().optional(),
    assigneeId: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.priority !== undefined ||
      data.dueDate !== undefined ||
      data.assigneeId !== undefined,
    { message: 'At least one field to update is required' }
  );

const createRiskSchema = z.object({
  title: z.string().min(1),
  projectId: z.string().optional(),
  description: z.string().optional(),
  category: z
    .enum(['technical', 'external', 'organizational', 'project_management'])
    .optional(),
  probability: z.number().int().min(1).max(5).optional(),
  impact: z.number().int().min(1).max(5).optional(),
  status: z.enum(['open', 'mitigating', 'closed', 'occurred']).optional(),
  response: z.enum(['avoid', 'mitigate', 'transfer', 'accept']).optional(),
  mitigationPlan: z.string().optional(),
  ownerId: z.string().optional(),
  taskIds: z.union([z.array(z.string()), z.string()]).optional(),
});

const updateRiskSchema = z
  .object({
    riskId: z.string().min(1),
    title: z.string().optional(),
    description: z.string().optional(),
    category: z
      .enum(['technical', 'external', 'organizational', 'project_management'])
      .optional(),
    probability: z.number().int().min(1).max(5).optional(),
    impact: z.number().int().min(1).max(5).optional(),
    status: z.enum(['open', 'mitigating', 'closed', 'occurred']).optional(),
    response: z.enum(['avoid', 'mitigate', 'transfer', 'accept']).optional(),
    mitigationPlan: z.string().optional(),
    ownerId: z.string().nullable().optional(),
    taskIds: z.union([z.array(z.string()), z.string()]).optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.category !== undefined ||
      data.probability !== undefined ||
      data.impact !== undefined ||
      data.status !== undefined ||
      data.response !== undefined ||
      data.mitigationPlan !== undefined ||
      data.ownerId !== undefined ||
      data.taskIds !== undefined,
    { message: 'At least one field to update is required' }
  );

const createChangeRequestSchema = z.object({
  title: z.string().min(1),
  projectId: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  impactScope: z.string().optional(),
  impactDays: z.number().int().optional(),
  impactCost: z.number().optional(),
  requestedById: z.string().optional(),
});

const updateChangeRequestStatusSchema = z.object({
  changeRequestId: z.string().min(1),
  status: z.enum(['approved', 'rejected']),
  decision: z.string().optional(),
});

const logTimeEntrySchema = z.object({
  taskId: z.string().min(1),
  hours: z.number().positive(),
  date: z.string().optional(),
  description: z.string().optional(),
  billable: z.boolean().optional(),
  userId: z.string().optional(),
});

const createSprintSchema = z.object({
  name: z.string().min(1),
  projectId: z.string().optional(),
  goal: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed']).optional(),
});

const engagementEnum = z.enum(['unaware', 'resistant', 'neutral', 'supportive', 'leading']);

const createStakeholderSchema = z.object({
  name: z.string().min(1),
  projectId: z.string().optional(),
  organization: z.string().optional(),
  role: z.string().optional(),
  email: z.string().optional(),
  influence: z.number().int().min(1).max(5).optional(),
  interest: z.number().int().min(1).max(5).optional(),
  engagement: engagementEnum.optional(),
  strategy: z.string().optional(),
});

const updateStakeholderSchema = z
  .object({
    stakeholderId: z.string().min(1),
    name: z.string().optional(),
    organization: z.string().optional(),
    role: z.string().optional(),
    email: z.string().optional(),
    influence: z.number().int().min(1).max(5).optional(),
    interest: z.number().int().min(1).max(5).optional(),
    engagement: engagementEnum.optional(),
    strategy: z.string().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.organization !== undefined ||
      data.role !== undefined ||
      data.email !== undefined ||
      data.influence !== undefined ||
      data.interest !== undefined ||
      data.engagement !== undefined ||
      data.strategy !== undefined,
    { message: 'At least one field to update is required' }
  );

const listStakeholdersSchema = z.object({
  projectId: z.string().optional(),
  engagement: engagementEnum.optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

async function assertRiskInWorkspace(
  riskId: string,
  workspaceId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const risk = await db.risk.findUnique({
    where: { id: riskId },
    select: { project: { select: { workspaceId: true } } },
  });
  if (!risk || risk.project.workspaceId !== workspaceId) {
    return { ok: false, error: 'Risk not found in workspace' };
  }
  return { ok: true };
}

async function assertChangeRequestInWorkspace(
  changeRequestId: string,
  workspaceId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const changeRequest = await db.changeRequest.findUnique({
    where: { id: changeRequestId },
    select: { project: { select: { workspaceId: true } } },
  });
  if (!changeRequest || changeRequest.project.workspaceId !== workspaceId) {
    return { ok: false, error: 'Change request not found in workspace' };
  }
  return { ok: true };
}

async function assertStakeholderInWorkspace(
  stakeholderId: string,
  workspaceId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const stakeholder = await db.stakeholder.findUnique({
    where: { id: stakeholderId },
    select: { project: { select: { workspaceId: true } } },
  });
  if (!stakeholder || stakeholder.project.workspaceId !== workspaceId) {
    return { ok: false, error: 'Stakeholder not found in workspace' };
  }
  return { ok: true };
}

function clampStakeholderRating(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  return Math.min(5, Math.max(1, value));
}

function formatStakeholderResponse(stakeholder: {
  id: string;
  name: string;
  organization: string | null;
  role: string | null;
  email: string | null;
  influence: number;
  interest: number;
  engagement: string;
  strategy: string | null;
  projectId: string;
  project: { id: string; name: string };
}) {
  return {
    id: stakeholder.id,
    name: stakeholder.name,
    organization: stakeholder.organization,
    role: stakeholder.role,
    email: stakeholder.email,
    influence: stakeholder.influence,
    interest: stakeholder.interest,
    engagement: stakeholder.engagement,
    strategy: stakeholder.strategy,
    projectId: stakeholder.projectId,
    projectName: stakeholder.project.name,
  };
}

function buildPendingResult(pending: PendingAction, message: string): ToolResult {
  return {
    success: true,
    pending: true,
    actionId: pending.actionId,
    preview: pending.preview,
    data: {
      message,
      actionId: pending.actionId,
      preview: pending.preview,
    },
  };
}

const listRisksSchema = z.object({
  projectId: z.string().optional(),
  limit: z.number().int().min(1).max(30).optional(),
  activeOnly: z.boolean().optional(),
});

const getEvmSchema = z.object({
  projectId: z.string().optional(),
});

const listChangeRequestsSchema = z.object({
  projectId: z.string().optional(),
  pendingOnly: z.boolean().optional(),
});

const getCriticalPathSchema = z.object({
  projectId: z.string().min(1),
});

async function handleListTasks(
  args: z.infer<typeof listTasksSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const limit = args.limit ?? 20;
  const now = new Date();

  const where: Record<string, unknown> = {
    project: { workspaceId: ctx.workspaceId },
  };

  if (args.status) where.status = args.status;
  if (args.projectId) {
    const access = await assertProjectInWorkspace(args.projectId, ctx.workspaceId);
    if (!access.ok) return { success: false, error: 'Project not found in workspace' };
    where.projectId = args.projectId;
  } else if (ctx.projectId) {
    where.projectId = ctx.projectId;
  }

  if (args.overdue) {
    where.dueDate = { lt: now };
    where.status = { not: 'done' };
  }

  const tasks = await db.task.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      estimatedHours: true,
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return {
    success: true,
    data: tasks.map((t) => ({
      ...t,
      dueDate: t.dueDate?.toISOString() ?? null,
      overdue: t.dueDate ? t.dueDate < now && t.status !== 'done' : false,
    })),
  };
}

async function handleCreateTask(
  args: z.infer<typeof createTaskSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const projectId = args.projectId ?? ctx.projectId;
  if (!projectId) {
    return { success: false, error: 'projectId is required to create a task' };
  }

  const projectAccess = await assertProjectInWorkspace(projectId, ctx.workspaceId);
  if (!projectAccess.ok) {
    return { success: false, error: 'Project not found in workspace' };
  }

  if (args.assigneeId) {
    const userAccess = await assertUserInWorkspace(args.assigneeId, ctx.workspaceId);
    if (!userAccess.ok) {
      return { success: false, error: 'Assignee not found in workspace' };
    }
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });

  let assigneeName: string | null = null;
  if (args.assigneeId) {
    const user = await db.user.findUnique({
      where: { id: args.assigneeId },
      select: { name: true },
    });
    assigneeName = user?.name ?? null;
  }

  const preview = {
    title: args.title,
    description: args.description ?? null,
    status: 'todo',
    priority: args.priority ?? 'medium',
    dueDate: args.dueDate ?? null,
    projectId,
    projectName: project?.name,
    assigneeId: args.assigneeId ?? null,
    assigneeName,
    creatorId: ctx.userId ?? null,
  };

  const pending = await storePendingAction({
    toolName: 'create_task',
    args: { ...args, projectId },
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    preview,
  });

  return {
    success: true,
    pending: true,
    actionId: pending.actionId,
    preview,
    data: {
      message: 'Task creation pending user confirmation',
      actionId: pending.actionId,
      preview,
    },
  };
}

async function handleUpdateTaskStatus(
  args: z.infer<typeof updateTaskStatusSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const access = await assertTaskInWorkspace(args.taskId, ctx.workspaceId);
  if (!access.ok) {
    return { success: false, error: 'Task not found in workspace' };
  }

  const task = await db.task.findUnique({
    where: { id: args.taskId },
    select: {
      id: true,
      title: true,
      status: true,
      project: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    return { success: false, error: 'Task not found' };
  }

  if (args.status === 'done') {
    return {
      success: false,
      error:
        'Cannot mark task as done via AI. Task closure requires resolution summary and lessons learned via the UI.',
    };
  }

  const preview = {
    taskId: task.id,
    taskTitle: task.title,
    currentStatus: task.status,
    newStatus: args.status,
    projectName: task.project.name,
  };

  const pending = await storePendingAction({
    toolName: 'update_task_status',
    args,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    preview,
  });

  return buildPendingResult(pending, 'Status update pending user confirmation');
}

async function handleUpdateTask(
  args: z.infer<typeof updateTaskSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const access = await assertTaskInWorkspace(args.taskId, ctx.workspaceId);
  if (!access.ok) {
    return { success: false, error: 'Task not found in workspace' };
  }

  if (args.assigneeId) {
    const userAccess = await assertUserInWorkspace(args.assigneeId, ctx.workspaceId);
    if (!userAccess.ok) {
      return { success: false, error: 'Assignee not found in workspace' };
    }
  }

  const task = await db.task.findUnique({
    where: { id: args.taskId },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      assigneeId: true,
      assignee: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    return { success: false, error: 'Task not found' };
  }

  let newAssigneeName: string | null | undefined;
  if (args.assigneeId === null) {
    newAssigneeName = null;
  } else if (args.assigneeId) {
    const user = await db.user.findUnique({
      where: { id: args.assigneeId },
      select: { name: true },
    });
    newAssigneeName = user?.name ?? null;
  }

  const preview = {
    taskId: task.id,
    taskTitle: task.title,
    projectName: task.project.name,
    currentStatus: task.status,
    newStatus: args.status ?? null,
    currentPriority: task.priority,
    newPriority: args.priority ?? null,
    currentDueDate: task.dueDate?.toISOString() ?? null,
    newDueDate: args.dueDate === undefined ? null : args.dueDate,
    currentAssigneeName: task.assignee?.name ?? null,
    newAssigneeName: args.assigneeId === undefined ? null : newAssigneeName,
  };

  const pending = await storePendingAction({
    toolName: 'update_task',
    args,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    preview,
  });

  return buildPendingResult(pending, 'Task update pending user confirmation');
}

async function handleCreateRisk(
  args: z.infer<typeof createRiskSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const projectId = args.projectId ?? ctx.projectId;
  if (!projectId) {
    return { success: false, error: 'projectId is required to create a risk' };
  }

  const projectAccess = await assertProjectInWorkspace(projectId, ctx.workspaceId);
  if (!projectAccess.ok) {
    return { success: false, error: 'Project not found in workspace' };
  }

  if (args.ownerId) {
    const userAccess = await assertUserInWorkspace(args.ownerId, ctx.workspaceId);
    if (!userAccess.ok) {
      return { success: false, error: 'Owner not found in workspace' };
    }
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });

  let ownerName: string | null = null;
  if (args.ownerId) {
    const owner = await db.user.findUnique({
      where: { id: args.ownerId },
      select: { name: true },
    });
    ownerName = owner?.name ?? null;
  }

  const preview = {
    title: args.title,
    description: args.description ?? null,
    category: args.category ?? 'technical',
    probability: args.probability ?? 3,
    impact: args.impact ?? 3,
    status: args.status ?? 'open',
    response: args.response ?? 'mitigate',
    mitigationPlan: args.mitigationPlan ?? null,
    projectId,
    projectName: project?.name,
    ownerId: args.ownerId ?? null,
    ownerName,
    taskIds: args.taskIds ?? [],
  };

  const pending = await storePendingAction({
    toolName: 'create_risk',
    args: { ...args, projectId },
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    preview,
  });

  return buildPendingResult(pending, 'Risk creation pending user confirmation');
}

async function handleUpdateRisk(
  args: z.infer<typeof updateRiskSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const access = await assertRiskInWorkspace(args.riskId, ctx.workspaceId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  if (args.ownerId) {
    const userAccess = await assertUserInWorkspace(args.ownerId, ctx.workspaceId);
    if (!userAccess.ok) {
      return { success: false, error: 'Owner not found in workspace' };
    }
  }

  const risk = await db.risk.findUnique({
    where: { id: args.riskId },
    include: {
      owner: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  if (!risk) {
    return { success: false, error: 'Risk not found' };
  }

  let newOwnerName: string | null | undefined;
  if (args.ownerId === null) {
    newOwnerName = null;
  } else if (args.ownerId) {
    const owner = await db.user.findUnique({
      where: { id: args.ownerId },
      select: { name: true },
    });
    newOwnerName = owner?.name ?? null;
  }

  const preview = {
    riskId: risk.id,
    riskTitle: risk.title,
    projectName: risk.project.name,
    newTitle: args.title ?? null,
    newDescription: args.description ?? null,
    newCategory: args.category ?? null,
    currentProbability: risk.probability,
    newProbability: args.probability ?? null,
    currentImpact: risk.impact,
    newImpact: args.impact ?? null,
    currentStatus: risk.status,
    newStatus: args.status ?? null,
    currentResponse: risk.response,
    newResponse: args.response ?? null,
    newMitigationPlan: args.mitigationPlan ?? null,
    currentOwnerName: risk.owner?.name ?? null,
    newOwnerName: args.ownerId === undefined ? null : newOwnerName,
    newTaskIds: args.taskIds ?? null,
  };

  const pending = await storePendingAction({
    toolName: 'update_risk',
    args,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    preview,
  });

  return buildPendingResult(pending, 'Risk update pending user confirmation');
}

async function handleCreateStakeholder(
  args: z.infer<typeof createStakeholderSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const projectId = args.projectId ?? ctx.projectId;
  if (!projectId) {
    return { success: false, error: 'projectId is required to create a stakeholder' };
  }

  const projectAccess = await assertProjectInWorkspace(projectId, ctx.workspaceId);
  if (!projectAccess.ok) {
    return { success: false, error: 'Project not found in workspace' };
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });

  const preview = {
    name: args.name,
    organization: args.organization ?? null,
    role: args.role ?? null,
    email: args.email ?? null,
    influence: args.influence ?? 3,
    interest: args.interest ?? 3,
    engagement: args.engagement ?? 'neutral',
    strategy: args.strategy ?? null,
    projectId,
    projectName: project?.name,
  };

  const pending = await storePendingAction({
    toolName: 'create_stakeholder',
    args: { ...args, projectId },
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    preview,
  });

  return buildPendingResult(pending, 'Stakeholder creation pending user confirmation');
}

async function handleUpdateStakeholder(
  args: z.infer<typeof updateStakeholderSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const access = await assertStakeholderInWorkspace(args.stakeholderId, ctx.workspaceId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const stakeholder = await db.stakeholder.findUnique({
    where: { id: args.stakeholderId },
    include: { project: { select: { id: true, name: true } } },
  });

  if (!stakeholder) {
    return { success: false, error: 'Stakeholder not found' };
  }

  const preview = {
    stakeholderId: stakeholder.id,
    stakeholderName: stakeholder.name,
    projectName: stakeholder.project.name,
    newName: args.name ?? null,
    newOrganization: args.organization ?? null,
    newRole: args.role ?? null,
    newEmail: args.email ?? null,
    currentInfluence: stakeholder.influence,
    newInfluence: args.influence ?? null,
    currentInterest: stakeholder.interest,
    newInterest: args.interest ?? null,
    currentEngagement: stakeholder.engagement,
    newEngagement: args.engagement ?? null,
    newStrategy: args.strategy ?? null,
  };

  const pending = await storePendingAction({
    toolName: 'update_stakeholder',
    args,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    preview,
  });

  return buildPendingResult(pending, 'Stakeholder update pending user confirmation');
}

async function handleCreateChangeRequest(
  args: z.infer<typeof createChangeRequestSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const projectId = args.projectId ?? ctx.projectId;
  if (!projectId) {
    return { success: false, error: 'projectId is required to create a change request' };
  }

  const projectAccess = await assertProjectInWorkspace(projectId, ctx.workspaceId);
  if (!projectAccess.ok) {
    return { success: false, error: 'Project not found in workspace' };
  }

  if (args.requestedById) {
    const userAccess = await assertUserInWorkspace(args.requestedById, ctx.workspaceId);
    if (!userAccess.ok) {
      return { success: false, error: 'Requester not found in workspace' };
    }
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });

  let requestedByName: string | null = null;
  if (args.requestedById) {
    const user = await db.user.findUnique({
      where: { id: args.requestedById },
      select: { name: true },
    });
    requestedByName = user?.name ?? null;
  }

  const preview = {
    title: args.title,
    description: args.description ?? null,
    priority: args.priority ?? 'medium',
    impactScope: args.impactScope ?? null,
    impactDays: args.impactDays ?? 0,
    impactCost: args.impactCost ?? 0,
    projectId,
    projectName: project?.name,
    requestedById: args.requestedById ?? ctx.userId ?? null,
    requestedByName: requestedByName ?? (ctx.userId ? null : null),
  };

  if (!args.requestedById && ctx.userId) {
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true },
    });
    preview.requestedByName = user?.name ?? null;
  }

  const pending = await storePendingAction({
    toolName: 'create_change_request',
    args: {
      ...args,
      projectId,
      requestedById: args.requestedById ?? ctx.userId ?? null,
    },
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    preview,
  });

  return buildPendingResult(pending, 'Change request creation pending user confirmation');
}

async function handleUpdateChangeRequestStatus(
  args: z.infer<typeof updateChangeRequestStatusSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const access = await assertChangeRequestInWorkspace(args.changeRequestId, ctx.workspaceId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const changeRequest = await db.changeRequest.findUnique({
    where: { id: args.changeRequestId },
    select: {
      id: true,
      title: true,
      status: true,
      project: { select: { name: true } },
    },
  });

  if (!changeRequest) {
    return { success: false, error: 'Change request not found' };
  }

  const preview = {
    changeRequestId: changeRequest.id,
    changeRequestTitle: changeRequest.title,
    projectName: changeRequest.project.name,
    currentStatus: changeRequest.status,
    newStatus: args.status,
    decision: args.decision ?? null,
  };

  const pending = await storePendingAction({
    toolName: 'update_change_request_status',
    args,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    preview,
  });

  return buildPendingResult(pending, 'Change request status update pending user confirmation');
}

async function handleLogTimeEntry(
  args: z.infer<typeof logTimeEntrySchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const access = await assertTaskInWorkspace(args.taskId, ctx.workspaceId);
  if (!access.ok) {
    return { success: false, error: 'Task not found in workspace' };
  }

  const userId = args.userId ?? ctx.userId ?? null;
  if (userId) {
    const userAccess = await assertUserInWorkspace(userId, ctx.workspaceId);
    if (!userAccess.ok) {
      return { success: false, error: 'User not found in workspace' };
    }
  }

  const task = await db.task.findUnique({
    where: { id: args.taskId },
    select: {
      id: true,
      title: true,
      project: { select: { id: true, name: true, hourlyRate: true } },
    },
  });

  if (!task) {
    return { success: false, error: 'Task not found' };
  }

  let userName: string | null = null;
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    userName = user?.name ?? null;
  }

  const preview = {
    taskId: task.id,
    taskTitle: task.title,
    projectName: task.project.name,
    hours: args.hours,
    date: args.date ?? new Date().toISOString(),
    description: args.description ?? null,
    billable: args.billable ?? true,
    userId,
    userName,
  };

  const pending = await storePendingAction({
    toolName: 'log_time_entry',
    args: { ...args, userId },
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    preview,
  });

  return buildPendingResult(pending, 'Time entry pending user confirmation');
}

async function handleCreateSprint(
  args: z.infer<typeof createSprintSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const projectId = args.projectId ?? ctx.projectId;
  if (!projectId) {
    return { success: false, error: 'projectId is required to create a sprint' };
  }

  const projectAccess = await assertProjectInWorkspace(projectId, ctx.workspaceId);
  if (!projectAccess.ok) {
    return { success: false, error: 'Project not found in workspace' };
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });

  const preview = {
    name: args.name.trim(),
    goal: args.goal?.trim() ?? null,
    projectId,
    projectName: project?.name,
    startDate: args.startDate ?? null,
    endDate: args.endDate ?? null,
    status: args.status ?? 'planning',
  };

  const pending = await storePendingAction({
    toolName: 'create_sprint',
    args: { ...args, projectId, name: args.name.trim() },
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    preview,
  });

  return buildPendingResult(pending, 'Sprint creation pending user confirmation');
}

async function handleListProjects(ctx: ToolAuthContext): Promise<ToolResult> {
  const projects = await db.project.findMany({
    where: { workspaceId: ctx.workspaceId },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      icon: true,
      startDate: true,
      endDate: true,
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    success: true,
    data: projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color,
      icon: p.icon,
      startDate: p.startDate?.toISOString() ?? null,
      endDate: p.endDate?.toISOString() ?? null,
      taskCount: p._count.tasks,
    })),
  };
}

async function handleListRisks(
  args: z.infer<typeof listRisksSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const limit = args.limit ?? 10;
  const activeOnly = args.activeOnly ?? true;
  const projectId = args.projectId ?? ctx.projectId ?? null;
  const scopedWhere = buildProjectScopedWhere(ctx.workspaceId, projectId);

  const risks = await db.risk.findMany({
    where: {
      ...(scopedWhere ?? {}),
      ...(activeOnly ? { status: { in: ['open', 'mitigating'] } } : {}),
    },
    include: { owner: true, project: true },
    orderBy: { createdAt: 'desc' },
  });

  const taskMap = await loadRelatedTasksForRisks(risks, projectId);
  const formatted = risks
    .map((risk) => {
      const relatedTasks = risk.taskIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .map((id) => taskMap.get(id))
        .filter((t): t is { id: string; title: string; status: string } => Boolean(t));
      return formatRiskResponse(risk, relatedTasks);
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);

  return { success: true, data: formatted };
}

async function handleListStakeholders(
  args: z.infer<typeof listStakeholdersSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const limit = args.limit ?? 20;
  const projectId = args.projectId ?? ctx.projectId ?? null;
  const scopedWhere = buildProjectScopedWhere(ctx.workspaceId, projectId);

  const stakeholders = await db.stakeholder.findMany({
    where: {
      ...(scopedWhere ?? {}),
      ...(args.engagement ? { engagement: args.engagement } : {}),
    },
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ influence: 'desc' }, { interest: 'desc' }],
    take: limit,
  });

  return {
    success: true,
    data: stakeholders.map(formatStakeholderResponse),
  };
}

async function handleGetEvmSummary(
  args: z.infer<typeof getEvmSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const projectId = args.projectId ?? ctx.projectId;
  if (projectId) {
    const access = await assertProjectInWorkspace(projectId, ctx.workspaceId);
    if (!access.ok) return { success: false, error: 'Project not found in workspace' };
  }

  const data = await getEvmSummary(ctx.workspaceId, projectId);
  return { success: true, data };
}

async function handleListChangeRequests(
  args: z.infer<typeof listChangeRequestsSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const projectId = args.projectId ?? ctx.projectId ?? null;
  const scopedWhere = buildProjectScopedWhere(ctx.workspaceId, projectId);

  const changeRequests = await db.changeRequest.findMany({
    where: {
      ...(scopedWhere ?? {}),
      ...(args.pendingOnly ? { status: 'pending' } : {}),
    },
    include: {
      requestedBy: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return { success: true, data: changeRequests };
}

async function handleGetWorkload(ctx: ToolAuthContext): Promise<ToolResult> {
  const data = await getWorkload(ctx.workspaceId);
  return {
    success: true,
    data: data.map((w) => ({
      userId: w.userId,
      name: w.name,
      weeklyCapacity: w.weeklyCapacity,
      openTaskCount: w.openTaskCount,
      openHours: w.openHours,
      loggedThisWeek: w.loggedThisWeek,
      utilization: Math.round(w.utilization),
      level: w.level,
    })),
  };
}

async function handleGetCriticalPath(
  args: z.infer<typeof getCriticalPathSchema>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  try {
    const data = await getCriticalPath(args.projectId, ctx.workspaceId);
    return {
      success: true,
      data: {
        projectId: data.projectId,
        projectDuration: data.projectDuration,
        criticalPathCount: data.criticalPath.length,
        criticalTasks: data.tasks
          .filter((t) => t.critical)
          .map((t) => ({
            id: t.id,
            title: t.title,
            duration: t.duration,
            slack: t.slack,
            assigneeName: t.assigneeName,
          })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compute critical path',
    };
  }
}

export async function executeConfirmedAction(
  toolName: WriteToolName,
  args: Record<string, unknown>,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  if (toolName === 'create_task') {
    const parsed = createTaskSchema.safeParse(args);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const projectId = parsed.data.projectId ?? ctx.projectId;
    if (!projectId) return { success: false, error: 'projectId is required' };

    const projectAccess = await assertProjectInWorkspace(projectId, ctx.workspaceId);
    if (!projectAccess.ok) return { success: false, error: 'Project not found in workspace' };

    if (parsed.data.assigneeId) {
      const userAccess = await assertUserInWorkspace(parsed.data.assigneeId, ctx.workspaceId);
      if (!userAccess.ok) return { success: false, error: 'Assignee not found in workspace' };
    }

    const task = await db.task.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: 'todo',
        priority: parsed.data.priority ?? 'medium',
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        projectId,
        assigneeId: parsed.data.assigneeId ?? null,
        creatorId: ctx.userId ?? null,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    triggerReindex(ctx.workspaceId, 'task', task.id);

    return { success: true, data: task };
  }

  if (toolName === 'update_task_status') {
    const parsed = updateTaskStatusSchema.safeParse(args);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    if (parsed.data.status === 'done') {
      return {
        success: false,
        error:
          'Cannot mark task as done via this tool. Task closure requires resolution summary and lessons learned via the UI.',
      };
    }

    const access = await assertTaskInWorkspace(parsed.data.taskId, ctx.workspaceId);
    if (!access.ok) return { success: false, error: 'Task not found in workspace' };

    const task = await db.task.update({
      where: { id: parsed.data.taskId },
      data: { status: parsed.data.status },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    triggerReindex(ctx.workspaceId, 'task', task.id);

    return { success: true, data: task };
  }

  if (toolName === 'update_task') {
    const parsed = updateTaskSchema.safeParse(args);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const access = await assertTaskInWorkspace(parsed.data.taskId, ctx.workspaceId);
    if (!access.ok) return { success: false, error: 'Task not found in workspace' };

    if (parsed.data.status === 'done') {
      return {
        success: false,
        error:
          'Cannot mark task as done via this tool. Task closure requires resolution summary and lessons learned via the UI.',
      };
    }

    if (parsed.data.assigneeId) {
      const userAccess = await assertUserInWorkspace(parsed.data.assigneeId, ctx.workspaceId);
      if (!userAccess.ok) return { success: false, error: 'Assignee not found in workspace' };
    }

    const task = await db.task.update({
      where: { id: parsed.data.taskId },
      data: {
        ...(parsed.data.status !== undefined && { status: parsed.data.status }),
        ...(parsed.data.priority !== undefined && { priority: parsed.data.priority }),
        ...(parsed.data.dueDate !== undefined && {
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        }),
        ...(parsed.data.assigneeId !== undefined && { assigneeId: parsed.data.assigneeId }),
      },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    triggerReindex(ctx.workspaceId, 'task', task.id);

    return { success: true, data: task };
  }

  if (toolName === 'create_risk') {
    const parsed = createRiskSchema.safeParse(args);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const projectId = parsed.data.projectId ?? ctx.projectId;
    if (!projectId) return { success: false, error: 'projectId is required' };

    const projectAccess = await assertProjectInWorkspace(projectId, ctx.workspaceId);
    if (!projectAccess.ok) return { success: false, error: 'Project not found in workspace' };

    if (parsed.data.ownerId) {
      const userAccess = await assertUserInWorkspace(parsed.data.ownerId, ctx.workspaceId);
      if (!userAccess.ok) return { success: false, error: 'Owner not found in workspace' };
    }

    const validatedTaskIds = await validateRiskTaskIds(parsed.data.taskIds, projectId);

    const risk = await db.risk.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        category: parsed.data.category ?? 'technical',
        probability: clampRiskRating(parsed.data.probability),
        impact: clampRiskRating(parsed.data.impact),
        status: parsed.data.status ?? 'open',
        response: parsed.data.response ?? 'mitigate',
        mitigationPlan: parsed.data.mitigationPlan ?? null,
        ownerId: parsed.data.ownerId ?? null,
        projectId,
        taskIds: validatedTaskIds.join(','),
      },
      include: { owner: true, project: true },
    });

    const taskMap = await loadRelatedTasksForRisks([risk], projectId);
    const relatedTasks = validatedTaskIds
      .map((id) => taskMap.get(id))
      .filter((t): t is { id: string; title: string; status: string } => Boolean(t));

    triggerReindex(ctx.workspaceId, 'risk', risk.id);

    return { success: true, data: formatRiskResponse(risk, relatedTasks) };
  }

  if (toolName === 'update_risk') {
    const parsed = updateRiskSchema.safeParse(args);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const access = await assertRiskInWorkspace(parsed.data.riskId, ctx.workspaceId);
    if (!access.ok) return { success: false, error: access.error };

    if (parsed.data.ownerId) {
      const userAccess = await assertUserInWorkspace(parsed.data.ownerId, ctx.workspaceId);
      if (!userAccess.ok) return { success: false, error: 'Owner not found in workspace' };
    }

    const existing = await db.risk.findUnique({ where: { id: parsed.data.riskId } });
    if (!existing) return { success: false, error: 'Risk not found' };

    let validatedTaskIds: string[] | undefined;
    if (parsed.data.taskIds !== undefined) {
      validatedTaskIds = await validateRiskTaskIds(parsed.data.taskIds, existing.projectId);
    }

    const { riskId, ...body } = parsed.data;
    void riskId;
    const data = buildRiskWriteData(body, validatedTaskIds);
    if (Object.keys(data).length === 0) {
      return { success: false, error: 'No valid fields to update' };
    }

    const risk = await db.risk.update({
      where: { id: parsed.data.riskId },
      data,
      include: { owner: true, project: true },
    });

    const taskMap = await loadRelatedTasksForRisks([risk], risk.projectId);
    const relatedTasks = risk.taskIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .map((id) => taskMap.get(id))
      .filter((t): t is { id: string; title: string; status: string } => Boolean(t));

    triggerReindex(ctx.workspaceId, 'risk', risk.id);

    return { success: true, data: formatRiskResponse(risk, relatedTasks) };
  }

  if (toolName === 'create_stakeholder') {
    const parsed = createStakeholderSchema.safeParse(args);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const projectId = parsed.data.projectId ?? ctx.projectId;
    if (!projectId) return { success: false, error: 'projectId is required' };

    const projectAccess = await assertProjectInWorkspace(projectId, ctx.workspaceId);
    if (!projectAccess.ok) return { success: false, error: 'Project not found in workspace' };

    const stakeholder = await db.stakeholder.create({
      data: {
        name: parsed.data.name,
        organization: parsed.data.organization ?? null,
        role: parsed.data.role ?? null,
        email: parsed.data.email ?? null,
        influence: clampStakeholderRating(parsed.data.influence, 3),
        interest: clampStakeholderRating(parsed.data.interest, 3),
        engagement: parsed.data.engagement ?? 'neutral',
        strategy: parsed.data.strategy ?? null,
        projectId,
      },
      include: { project: { select: { id: true, name: true } } },
    });

    triggerReindex(ctx.workspaceId, 'stakeholder', stakeholder.id);

    return { success: true, data: formatStakeholderResponse(stakeholder) };
  }

  if (toolName === 'update_stakeholder') {
    const parsed = updateStakeholderSchema.safeParse(args);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const access = await assertStakeholderInWorkspace(parsed.data.stakeholderId, ctx.workspaceId);
    if (!access.ok) return { success: false, error: access.error };

    const { stakeholderId, ...body } = parsed.data;
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.organization !== undefined) data.organization = body.organization;
    if (body.role !== undefined) data.role = body.role;
    if (body.email !== undefined) data.email = body.email;
    if (body.influence !== undefined) data.influence = clampStakeholderRating(body.influence, 3);
    if (body.interest !== undefined) data.interest = clampStakeholderRating(body.interest, 3);
    if (body.engagement !== undefined) data.engagement = body.engagement;
    if (body.strategy !== undefined) data.strategy = body.strategy;

    if (Object.keys(data).length === 0) {
      return { success: false, error: 'No valid fields to update' };
    }

    const stakeholder = await db.stakeholder.update({
      where: { id: stakeholderId },
      data,
      include: { project: { select: { id: true, name: true } } },
    });

    triggerReindex(ctx.workspaceId, 'stakeholder', stakeholder.id);

    return { success: true, data: formatStakeholderResponse(stakeholder) };
  }

  if (toolName === 'create_change_request') {
    const parsed = createChangeRequestSchema.safeParse(args);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const projectId = parsed.data.projectId ?? ctx.projectId;
    if (!projectId) return { success: false, error: 'projectId is required' };

    const projectAccess = await assertProjectInWorkspace(projectId, ctx.workspaceId);
    if (!projectAccess.ok) return { success: false, error: 'Project not found in workspace' };

    const requestedById = parsed.data.requestedById ?? ctx.userId ?? null;
    if (requestedById) {
      const userAccess = await assertUserInWorkspace(requestedById, ctx.workspaceId);
      if (!userAccess.ok) return { success: false, error: 'Requester not found in workspace' };
    }

    const changeRequest = await db.changeRequest.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        priority: parsed.data.priority ?? 'medium',
        impactScope: parsed.data.impactScope ?? null,
        impactDays: parsed.data.impactDays ?? 0,
        impactCost: parsed.data.impactCost ?? 0,
        requestedById,
        projectId,
      },
      include: { requestedBy: true, project: true },
    });

    triggerReindex(ctx.workspaceId, 'change_request', changeRequest.id);

    return { success: true, data: changeRequest };
  }

  if (toolName === 'update_change_request_status') {
    const parsed = updateChangeRequestStatusSchema.safeParse(args);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const access = await assertChangeRequestInWorkspace(parsed.data.changeRequestId, ctx.workspaceId);
    if (!access.ok) return { success: false, error: access.error };

    const changeRequest = await db.changeRequest.update({
      where: { id: parsed.data.changeRequestId },
      data: {
        status: parsed.data.status,
        ...(parsed.data.decision !== undefined && { decision: parsed.data.decision }),
        decidedAt: new Date(),
      },
      include: { requestedBy: true, project: true },
    });

    triggerReindex(ctx.workspaceId, 'change_request', changeRequest.id);

    return { success: true, data: changeRequest };
  }

  if (toolName === 'log_time_entry') {
    const parsed = logTimeEntrySchema.safeParse(args);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const access = await assertTaskInWorkspace(parsed.data.taskId, ctx.workspaceId);
    if (!access.ok) return { success: false, error: 'Task not found in workspace' };

    const userId = parsed.data.userId ?? ctx.userId ?? null;
    if (userId) {
      const userAccess = await assertUserInWorkspace(userId, ctx.workspaceId);
      if (!userAccess.ok) return { success: false, error: 'User not found in workspace' };
    }

    const task = await db.task.findUnique({
      where: { id: parsed.data.taskId },
      include: { project: true },
    });
    if (!task) return { success: false, error: 'Task not found' };

    const entry = await db.timeEntry.create({
      data: {
        taskId: parsed.data.taskId,
        projectId: task.projectId,
        userId,
        date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
        hours: parsed.data.hours,
        description: parsed.data.description ?? null,
        billable: parsed.data.billable ?? true,
        hourlyRate: task.project.hourlyRate,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true } },
      },
    });

    return { success: true, data: entry };
  }

  if (toolName === 'create_sprint') {
    const parsed = createSprintSchema.safeParse(args);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const projectId = parsed.data.projectId ?? ctx.projectId;
    if (!projectId) return { success: false, error: 'projectId is required' };

    const projectAccess = await assertProjectInWorkspace(projectId, ctx.workspaceId);
    if (!projectAccess.ok) return { success: false, error: 'Project not found in workspace' };

    const sprint = await db.sprint.create({
      data: {
        name: parsed.data.name.trim(),
        goal: parsed.data.goal?.trim() || null,
        projectId,
        status: parsed.data.status || 'planning',
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      },
    });

    return { success: true, data: sprint };
  }

  return { success: false, error: `Unknown write tool: ${toolName}` };
}

type HandlerFn = (args: Record<string, unknown>, ctx: ToolAuthContext) => Promise<ToolResult>;

const HANDLERS: Record<string, HandlerFn> = {
  list_tasks: (args, ctx) => {
    const parsed = listTasksSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleListTasks(parsed.data, ctx);
  },
  create_task: (args, ctx) => {
    const parsed = createTaskSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleCreateTask(parsed.data, ctx);
  },
  update_task_status: (args, ctx) => {
    const parsed = updateTaskStatusSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleUpdateTaskStatus(parsed.data, ctx);
  },
  update_task: (args, ctx) => {
    const parsed = updateTaskSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleUpdateTask(parsed.data, ctx);
  },
  create_risk: (args, ctx) => {
    const parsed = createRiskSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleCreateRisk(parsed.data, ctx);
  },
  update_risk: (args, ctx) => {
    const parsed = updateRiskSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleUpdateRisk(parsed.data, ctx);
  },
  create_stakeholder: (args, ctx) => {
    const parsed = createStakeholderSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleCreateStakeholder(parsed.data, ctx);
  },
  update_stakeholder: (args, ctx) => {
    const parsed = updateStakeholderSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleUpdateStakeholder(parsed.data, ctx);
  },
  create_change_request: (args, ctx) => {
    const parsed = createChangeRequestSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleCreateChangeRequest(parsed.data, ctx);
  },
  update_change_request_status: (args, ctx) => {
    const parsed = updateChangeRequestStatusSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleUpdateChangeRequestStatus(parsed.data, ctx);
  },
  log_time_entry: (args, ctx) => {
    const parsed = logTimeEntrySchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleLogTimeEntry(parsed.data, ctx);
  },
  create_sprint: (args, ctx) => {
    const parsed = createSprintSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleCreateSprint(parsed.data, ctx);
  },
  list_projects: (_args, ctx) => handleListProjects(ctx),
  list_risks: (args, ctx) => {
    const parsed = listRisksSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleListRisks(parsed.data, ctx);
  },
  list_stakeholders: (args, ctx) => {
    const parsed = listStakeholdersSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleListStakeholders(parsed.data, ctx);
  },
  get_evm_summary: (args, ctx) => {
    const parsed = getEvmSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleGetEvmSummary(parsed.data, ctx);
  },
  list_change_requests: (args, ctx) => {
    const parsed = listChangeRequestsSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleListChangeRequests(parsed.data, ctx);
  },
  get_workload: (_args, ctx) => handleGetWorkload(ctx),
  get_critical_path: (args, ctx) => {
    const parsed = getCriticalPathSchema.safeParse(args);
    if (!parsed.success) return Promise.resolve({ success: false, error: parsed.error.message });
    return handleGetCriticalPath(parsed.data, ctx);
  },
};

export async function executeTool(
  toolName: string,
  rawArgs: string,
  ctx: ToolAuthContext
): Promise<ToolResult> {
  const handler = HANDLERS[toolName];
  if (!handler) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    return { success: false, error: 'Invalid tool arguments JSON' };
  }

  try {
    return await handler(args, ctx);
  } catch (error) {
    console.error(`Tool ${toolName} error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    };
  }
}
